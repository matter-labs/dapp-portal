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

export const ESTIMATED_DEPOSIT_DELAY = 15 * 60 * 1000; // 15 minutes
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

  const getDepositL2TransactionHash = async (l1TransactionHash: string) => {
    const publicClient = onboardStore.getPublicClient();
    const transaction = await retry(() =>
      publicClient.waitForTransactionReceipt({
        hash: l1TransactionHash as Hash,
      })
    );
    for (const log of transaction.logs) {
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
    const transactionHash = await getDepositL2TransactionHash(transaction.transactionHash);
    const transactionReceipt = await providerStore.requestProvider().getTransactionReceipt(transactionHash);
    if (!transactionReceipt) return transaction;
    transaction.info.toTransactionHash = transactionHash;
    transaction.info.completed = true;
    return transaction;
  };
  const getWithdrawalStatus = async (transaction: TransactionInfo) => {
    if (!transaction.info.withdrawalFinalizationAvailable) {
      const transactionDetails = await providerStore
        .requestProvider()
        .getTransactionDetails(transaction.transactionHash);
      if (transactionDetails.status === "failed") {
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
      ?.isWithdrawalFinalized(transaction.transactionHash)
      .catch(() => false);
    transaction.info.withdrawalFinalizationAvailable = true;
    transaction.info.completed = isFinalized;
    return transaction;
  };
  const getTransferStatus = async (transaction: TransactionInfo) => {
    const transactionReceipt = await providerStore.requestProvider().getTransactionReceipt(transaction.transactionHash);
    if (!transactionReceipt) return transaction;
    const transactionDetails = await providerStore.requestProvider().getTransactionDetails(transaction.transactionHash);
    if (transactionDetails.status === "failed") {
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
