import { createEthersClient, createEthersSdk } from "@dutterbutter/zksync-sdk/ethers";
import { useStorage } from "@vueuse/core";
import { decodeEventLog } from "viem";
import IZkSyncHyperchain from "zksync-ethers/abi/IZkSyncHyperchain.json";

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
export const WITHDRAWAL_DELAY = 5 * 60 * 1000; // 5 minutes

// @zksyncos ZKsyncOS does not include getTransactionDetails so using executeTxHash as an
// indicator of finalization readiness is not available. Instead (a bit hacky), we first check
// tx receipt on L2 for success, query zks_getL1L2LogProofs to ensure tx is included in the batch
// and then make an simulation attempt to `finalizeDeposit` to see if we hit `LocalRootIsZero()`
// if so we know its not ready yet. If not we proceed to mark as ready.
// This approach is not ideal and may need to be refined in the future.

export const useZkSyncTransactionStatusStore = defineStore("zkSyncTransactionStatus", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const { getL1VoidSigner } = useZkSyncWalletStore();
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

  const getDepositL2TransactionHash = (l1Receipt: any) => {
    for (const log of l1Receipt.logs) {
      try {
        const { args, eventName } = decodeEventLog({
          abi: IZkSyncHyperchain,
          data: log.data,
          topics: log.topics,
        });
        if (eventName === "NewPriorityRequest") {
          return (args as unknown as { txHash: Hash }).txHash;
        }
      } catch {
        // ignore failed decoding
      }
    }
    throw new Error("No L2 transaction hash found");
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

    // Fetch L2 tx receipt
    const receipt = await provider.getTransactionReceipt(transaction.transactionHash);
    if (!receipt) {
      return transaction;
    }

    // If L2 tx failed, mark failed & completed and exit
    if ((receipt as any).status === 0) {
      transaction.info.withdrawalFinalizationAvailable = false;
      transaction.info.failed = true;
      transaction.info.completed = false;
      return transaction;
    }

    const signer = await getL1VoidSigner(true);

    const client = createEthersClient({ l1: signer.provider, l2: signer.providerL2, signer });
    const sdk = createEthersSdk(client);
    const status = await sdk.withdrawals.status(transaction.transactionHash as Hash);
    switch (status.phase) {
      case "FINALIZED":
        transaction.info.completed = true;
        transaction.info.failed = false;
        transaction.info.withdrawalFinalizationAvailable = false;
        return transaction;
      case "FINALIZE_FAILED":
        transaction.info.completed = true;
        transaction.info.failed = true;
        transaction.info.withdrawalFinalizationAvailable = false;
        return transaction;
      case "READY_TO_FINALIZE":
        transaction.info.completed = false;
        transaction.info.failed = false;
        transaction.info.withdrawalFinalizationAvailable = true;
        return transaction;
      default:
        return transaction;
    }
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
