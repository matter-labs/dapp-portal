import { createEthersSdk, getL2TransactionHashFromLogs } from "@matterlabs/zksync-js/ethers";
import { useStorage } from "@vueuse/core";

import type { FeeEstimationParams } from "@/composables/zksync/useFee";
import type { TokenAmount, Hash } from "@/types";

export type TransactionInfo = {
  type: FeeEstimationParams["type"] | "deposit";
  token: TokenAmount;
  from: { address: string; destination: TransactionDestination };
  to: { address: string; destination: TransactionDestination };
  transactionHash: string;
  timestamp: string;
  info: {
    toTransactionHash?: string;
    expectedCompleteTimestamp?: string;
    withdrawalFinalizationAvailable?: boolean;
    failed?: boolean;
    completed: boolean;
  };
};

export const ESTIMATED_DEPOSIT_DELAY = 15 * 1000; // 15 seconds
export const WITHDRAWAL_DELAY = 5 * 60 * 60 * 1000; // 5 hours

export const useZkSyncTransactionStatusStore = defineStore("zkSyncTransactionStatus", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const { account } = storeToRefs(onboardStore);
  const { eraNetwork } = storeToRefs(providerStore);

  const storageSavedTransactions = useStorage<{ [networkKey: string]: TransactionInfo[] }>(
    "zksync-bridge-transactions",
    {}
  );
  const savedTransactions = computed<TransactionInfo[]>({
    get: () => {
      return storageSavedTransactions.value[eraNetwork.value.key] || [];
    },
    set: (transactions: TransactionInfo[]) => {
      storageSavedTransactions.value[eraNetwork.value.key] = transactions;
    },
  });
  const userTransactions = computed(() =>
    savedTransactions.value.filter(
      (tx) =>
        tx.from.address === account.value.address ||
        (tx.type === "withdrawal" && tx.to.address === account.value.address)
    )
  );

  const getDepositL2TransactionHash = (l1Receipt: { logs: { address: string; topics: string[]; data: string }[] }) => {
    const l2TransactionHash = getL2TransactionHashFromLogs(l1Receipt.logs as any);
    if (!l2TransactionHash) throw new Error("No L2 transaction hash found");
    return l2TransactionHash;
  };
  const getDepositStatus = async (transaction: TransactionInfo) => {
    try {
      // Get L1 transaction receipt with retry logic for consistency
      const publicClient = onboardStore.getPublicClient();
      const l1Receipt = await retry(() =>
        publicClient.waitForTransactionReceipt({
          hash: transaction.transactionHash as Hash,
        })
      );

      // Create a copy to avoid mutating the input parameter
      const updatedTransaction = { ...transaction, info: { ...transaction.info } };

      // If L1 transaction failed, mark the deposit as failed
      if (l1Receipt.status === "reverted") {
        updatedTransaction.info.failed = true;
        updatedTransaction.info.completed = true;
        return updatedTransaction;
      }

      // L1 transaction succeeded, extract L2 transaction hash from the same receipt
      const l2TransactionHash = getDepositL2TransactionHash(l1Receipt);
      const provider = await providerStore.requestProvider();
      const l2TransactionReceipt = await provider.getTransactionReceipt(l2TransactionHash);
      if (!l2TransactionReceipt) return updatedTransaction;

      updatedTransaction.info.toTransactionHash = l2TransactionHash;
      updatedTransaction.info.completed = true;
      return updatedTransaction;
    } catch (err) {
      // Only mark as failed for specific transaction-related errors
      // Network/RPC errors should be re-thrown to allow retry at higher level
      const error = err as Error;
      if (
        error.message.includes("transaction") ||
        error.message.includes("reverted") ||
        error.message.includes("failed")
      ) {
        const updatedTransaction = { ...transaction, info: { ...transaction.info } };
        updatedTransaction.info.failed = true;
        updatedTransaction.info.completed = true;
        return updatedTransaction;
      }
      // Re-throw network/infrastructure errors for retry at higher level
      throw err;
    }
  };
  const getWithdrawalStatus = async (transaction: TransactionInfo) => {
    const provider = await providerStore.requestProvider();
    const receipt = await provider.getTransactionReceipt(transaction.transactionHash);
    if (!receipt) return transaction;

    // The SDK reports a reverted L2 withdrawal as pending forever
    if (receipt.status === 0) {
      transaction.info.withdrawalFinalizationAvailable = false;
      transaction.info.failed = true;
      transaction.info.completed = false;
      return transaction;
    }

    const client = await useZkSyncWalletStore().getReadOnlyZkSyncClient();
    const { phase } = await createEthersSdk(client).withdrawals.status(transaction.transactionHash as Hash);

    if (phase === "L2_PENDING" || phase === "UNKNOWN") return transaction;
    if (phase === "UNFINALIZABLE") {
      transaction.info.withdrawalFinalizationAvailable = false;
      transaction.info.failed = true;
      transaction.info.completed = false;
      return transaction;
    }

    transaction.info.withdrawalFinalizationAvailable = phase === "READY_TO_FINALIZE" || phase === "FINALIZED";
    transaction.info.completed = phase === "FINALIZED";
    transaction.info.failed = false;
    return transaction;
  };
  const getTransferStatus = async (transaction: TransactionInfo) => {
    const provider = await providerStore.requestProvider();
    const transactionReceipt = await provider.getTransactionReceipt(transaction.transactionHash);
    if (!transactionReceipt) return transaction;
    // TODO (zksyncos): ensure this is sufficient to check success
    if (transactionReceipt.status === 0) {
      transaction.info.failed = true;
    }
    transaction.info.completed = true;
    return transaction;
  };
  const waitForCompletion = async (transaction: TransactionInfo) => {
    if (transaction.info.completed) return transaction;
    if (transaction.type === "deposit") {
      transaction = await getDepositStatus(transaction);
    } else if (transaction.type === "withdrawal") {
      transaction = await getWithdrawalStatus(transaction);
    } else if (transaction.type === "transfer") {
      transaction = await getTransferStatus(transaction);
    }
    if (!transaction.info.completed) {
      const timeoutByType: Record<TransactionInfo["type"], number> = {
        deposit: 15_000,
        withdrawal: 30_000,
        transfer: 2_000,
      };
      await new Promise((resolve) => setTimeout(resolve, timeoutByType[transaction.type]));
      transaction = await waitForCompletion(transaction);
    }
    return transaction;
  };

  const saveTransaction = (transaction: TransactionInfo) => {
    if (
      savedTransactions.value.some(
        (existingTransaction) => existingTransaction.transactionHash === transaction.transactionHash
      )
    ) {
      updateTransactionData(transaction.transactionHash, transaction);
    } else {
      savedTransactions.value = [...savedTransactions.value, transaction];
    }
  };
  const updateTransactionData = (transactionHash: string, replaceTransaction: TransactionInfo) => {
    const transaction = savedTransactions.value.find((transaction) => transaction.transactionHash === transactionHash);
    if (!transaction) throw new Error("Transaction not found");
    const index = savedTransactions.value.indexOf(transaction);
    const newSavedTransactions = [...savedTransactions.value];
    newSavedTransactions[index] = replaceTransaction;
    savedTransactions.value = newSavedTransactions;
    return replaceTransaction;
  };
  const getTransaction = (transactionHash: string) => {
    transactionHash = transactionHash.toLowerCase();
    return savedTransactions.value.find((transaction) => transaction.transactionHash.toLowerCase() === transactionHash);
  };

  return {
    savedTransactions,
    userTransactions,
    waitForCompletion,
    saveTransaction,
    updateTransactionData,
    getTransaction,
  };
});
