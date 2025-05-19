import { useMemoize } from "@vueuse/core";
import { Wallet } from "zksync-ethers";
import IL1Nullifier from "zksync-ethers/abi/IL1Nullifier.json";
import { IL1AssetRouter__factory as IL1AssetRouterFactory } from "zksync-ethers/build/typechain";

import { useSentryLogger } from "../useSentryLogger";

import type { Hash } from "@/types";
import type { FinalizeWithdrawalParams } from "zksync-ethers/build/types";

export default (transactionInfo: ComputedRef<TransactionInfo>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "sending" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<Hash | undefined>();
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const walletStore = useZkSyncWalletStore();
  const tokensStore = useZkSyncTokensStore();
  const { isCorrectNetworkSet } = storeToRefs(onboardStore);
  const { ethToken } = storeToRefs(tokensStore);
  const { captureException } = useSentryLogger();

  const retrieveBridgeAddresses = useMemoize(() => providerStore.requestProvider().getDefaultBridgeAddresses());
  const retrieveL1NullifierAddress = useMemoize(async () => {
    const providerL1 = walletStore.getL1VoidSigner();
    return await IL1AssetRouterFactory.connect((await retrieveBridgeAddresses()).sharedL1, providerL1).L1_NULLIFIER();
  });

  const gasLimit = ref<bigint | undefined>();
  const gasPrice = ref<bigint | undefined>();
  const finalizeWithdrawalParams = ref<FinalizeWithdrawalParams | undefined>();

  const totalFee = computed(() => {
    if (!gasLimit.value || !gasPrice.value) return undefined;
    return calculateFee(gasLimit.value, gasPrice.value).toString();
  });
  const feeToken = computed(() => {
    return ethToken;
  });

  const getFinalizationParams = async () => {
    const provider = providerStore.requestProvider();
    const wallet = new Wallet(
      // random private key cause we don't care about actual signer
      // finalizeWithdrawalParams method only exists on Wallet class
      "0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110",
      provider
    );
    return await wallet.getFinalizeWithdrawalParams(transactionInfo.value.transactionHash);
  };

  const getTransactionParams = async () => {
    finalizeWithdrawalParams.value = await getFinalizationParams();
    const provider = providerStore.requestProvider();
    const chainId = BigInt(await provider.getNetwork().then((n) => n.chainId));
    const p = finalizeWithdrawalParams.value!;

    const finalizeDepositParams = {
      chainId: BigInt(chainId),
      l2BatchNumber: BigInt(p.l1BatchNumber ?? 0n),
      l2MessageIndex: BigInt(p.l2MessageIndex),
      l2Sender: p.sender as `0x${string}`,
      l2TxNumberInBatch: Number(p.l2TxNumberInBlock),
      message: p.message,
      merkleProof: p.proof,
    };

    return {
      address: (await retrieveL1NullifierAddress()) as Hash,
      abi: IL1Nullifier,
      account: onboardStore.account.address!,
      functionName: "finalizeDeposit",
      args: [finalizeDepositParams],
    } as const;
  };

  const {
    inProgress: estimationInProgress,
    error: estimationError,
    execute: estimateFee,
  } = usePromise(
    async () => {
      tokensStore.requestTokens();
      const publicClient = onboardStore.getPublicClient();

      const transactionParams = await getTransactionParams();
      const [price, limit] = await Promise.all([
        retry(async () => BigInt((await publicClient.getGasPrice()).toString())),
        retry(async () => {
          return BigInt(
            (
              await publicClient.estimateContractGas({
                ...transactionParams,
              })
            ).toString()
          );
        }),
      ]);

      gasPrice.value = price;
      gasLimit.value = limit;

      return {
        transactionParams,
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
      const wallet = await onboardStore.getWallet();
      const { transactionParams, gasLimit, gasPrice } = (await estimateFee())!;
      status.value = "waiting-for-signature";
      transactionHash.value = await wallet.writeContract({
        ...transactionParams,
        gasPrice: BigInt(gasPrice.toString()),
        gas: BigInt(gasLimit.toString()),
      });

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
