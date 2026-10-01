import { useStorage } from "@vueuse/core";
import { decodeEventLog, WaitForTransactionReceiptTimeoutError } from "viem";
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
    // Deposit only: the L1 transaction succeeded but the L2 transaction reverted
    l2Failed?: boolean;
    completed: boolean;
  };
};

export const ESTIMATED_DEPOSIT_DELAY = 15 * 60 * 1000; // 15 minutes
export const WITHDRAWAL_DELAY = 6 * 60 * 60 * 1000; // 6 hours

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

  // Returns undefined when the L1 transaction did not request an L2 transaction
  const getDepositL2TransactionHash = (l1Receipt: any): Hash | undefined => {
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
    return undefined;
  };
  const getDepositStatus = async (transaction: TransactionInfo) => {
    // Get L1 transaction receipt with retry logic for consistency
    const publicClient = onboardStore.getPublicClient();
    let l1Receipt;
    try {
      l1Receipt = await retry(() =>
        publicClient.waitForTransactionReceipt({
          hash: transaction.transactionHash as Hash,
        })
      );
    } catch (err) {
      // The L1 transaction is not mined yet, so the deposit stays pending and is checked again.
      // Other errors, such as RPC errors, say nothing about the deposit and are thrown
      if (err instanceof WaitForTransactionReceiptTimeoutError) return transaction;
      throw err;
    }

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
    // A successful L1 transaction without a priority request made no deposit, e.g. it was cancelled in the wallet
    if (!l2TransactionHash) {
      updatedTransaction.info.failed = true;
      updatedTransaction.info.completed = true;
      return updatedTransaction;
    }
    const provider = await providerStore.requestProvider();
    const l2TransactionReceipt = await provider.getTransactionReceipt(l2TransactionHash);
    if (!l2TransactionReceipt) return updatedTransaction;

    updatedTransaction.info.toTransactionHash = l2TransactionHash;
    // The L2 transaction was executed but reverted, so the funds were not delivered to the recipient
    if (l2TransactionReceipt.status === 0) {
      updatedTransaction.info.failed = true;
      updatedTransaction.info.l2Failed = true;
    }
    updatedTransaction.info.completed = true;
    return updatedTransaction;
  };
  const getWithdrawalStatus = async (transaction: TransactionInfo) => {
    if (!transaction.info.withdrawalFinalizationAvailable) {
      const provider = await providerStore.requestProvider();
      const [transactionDetails, transactionReceipt] = await Promise.all([
        provider.getTransactionDetails(transaction.transactionHash),
        provider.getTransactionReceipt(transaction.transactionHash),
      ]);
      // Some nodes do not report "failed" in the transaction details of a reverted transaction
      if (transactionDetails.status === "failed" || transactionReceipt?.status === 0) {
        transaction.info.withdrawalFinalizationAvailable = false;
        transaction.info.failed = true;
        transaction.info.completed = true;
        return transaction;
      }
      if (transactionDetails.status !== "verified") {
        return transaction;
      }
    }
    const isFinalized = await useZkSyncWalletStore()
      .getL1VoidSigner(true)
      .then((signer) => signer.isWithdrawalFinalized(transaction.transactionHash))
      .catch(() => false);
    transaction.info.withdrawalFinalizationAvailable = true;
    transaction.info.completed = isFinalized;
    return transaction;
  };
  const getTransferStatus = async (transaction: TransactionInfo) => {
    const provider = await providerStore.requestProvider();
    const transactionReceipt = await provider.getTransactionReceipt(transaction.transactionHash);
    if (!transactionReceipt) return transaction;
    const transactionDetails = await provider.getTransactionDetails(transaction.transactionHash);
    if (transactionDetails.status === "failed" || transactionReceipt.status === 0) {
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
