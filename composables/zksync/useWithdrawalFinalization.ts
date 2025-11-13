import { createEthersClient, createEthersSdk, createFinalizationServices } from "@dutterbutter/zksync-sdk/ethers";

import { useSentryLogger } from "../useSentryLogger";

import type { Hash } from "viem";

export default (transactionInfo: ComputedRef<TransactionInfo>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "sending" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<Hash | undefined>();
  const onboardStore = useOnboardStore();
  const walletStore = useZkSyncWalletStore();
  const tokensStore = useZkSyncTokensStore();
  const { isCorrectNetworkSet } = storeToRefs(onboardStore);
  const { ethToken } = storeToRefs(tokensStore);
  const { captureException } = useSentryLogger();

  const gasLimit = ref<bigint | undefined>();
  const gasPrice = ref<bigint | undefined>();

  const totalFee = computed(() => {
    if (!gasLimit.value || !gasPrice.value) return undefined;
    return calculateFee(gasLimit.value, gasPrice.value).toString();
  });
  const feeToken = computed(() => {
    return ethToken.value;
  });

  const {
    inProgress: estimationInProgress,
    error: estimationError,
    execute: estimateFee,
  } = usePromise(
    async () => {
      const l2TxHash = transactionInfo.value!.transactionHash as Hash;
      tokensStore.requestTokens();
      const publicClient = onboardStore.getPublicClient();

      const [price, estimate] = await Promise.all([
        retry(async () => BigInt((await publicClient.getGasPrice()).toString())),
        retry(async () => {
          const signer = await walletStore.getL1VoidSigner(true);
          const client = createEthersClient({ l1: signer.provider, l2: signer.providerL2, signer });
          const svc = createFinalizationServices(client);
          const { params } = await svc.fetchFinalizeDepositParams(l2TxHash);

          return svc.estimateFinalization(params);
        }),
      ]);

      gasPrice.value = price;
      gasLimit.value = estimate.gasLimit;

      return {
        gasPrice: gasPrice.value,
        gasLimit: gasLimit.value,
      };
    },
    { cache: 1000 * 8 }
  );

  const commitTransaction = async () => {
    try {
      error.value = undefined;

      status.value = "processing";
      if (!isCorrectNetworkSet.value) {
        await onboardStore.setCorrectNetwork();
      }
      status.value = "waiting-for-signature";
      const signer = (await walletStore.getL1Signer())!;
      const client = createEthersClient({ l1: signer.provider, l2: signer.providerL2, signer });
      const sdk = createEthersSdk(client);
      const transaction = await sdk.withdrawals.finalize(transactionInfo.value!.transactionHash as Hash);
      if (!transaction.receipt) {
        throw new Error("Finalization transaction failed");
      }
      transactionHash.value = transaction.receipt?.hash as Hash;

      status.value = "sending";
      const receipt = await retry(() =>
        onboardStore.getPublicClient().waitForTransactionReceipt({
          hash: transactionHash.value!,
          onReplaced: (replacement) => {
            transactionHash.value = replacement.transaction.hash;
          },
        })
      );

      trackEvent("withdrawal-finalized", {
        token: transactionInfo.value!.token.symbol,
        amount: transactionInfo.value!.token.amount,
        to: transactionInfo.value!.to.address,
      });

      status.value = "done";
      return receipt;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      error.value = formatError(err as Error);
      status.value = "not-started";
      captureException({
        error: err as Error,
        parentFunctionName: "commitTransaction",
        parentFunctionParams: [],
        filePath: "composables/zksync/useWithdrawalFinalization.ts",
      });
    }
  };

  return {
    estimationError,
    estimationInProgress,
    totalFee,
    feeToken,
    estimateFee,

    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
