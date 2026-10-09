import { abi } from "@matterlabs/zksync-js";
import { createFinalizationServices } from "@matterlabs/zksync-js/ethers";

import { L1_BRIDGE_ABI } from "@/data/abis/l1BridgeAbi";
import { customBridgeTokens } from "@/data/customBridgeTokens";

import { useSentryLogger } from "../useSentryLogger";

import type { Hash } from "@/types";
import type { Address } from "viem";

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

  const gasLimit = ref<bigint | undefined>();
  const gasPrice = ref<bigint | undefined>();

  const totalFee = computed(() => {
    if (!gasLimit.value || !gasPrice.value) return undefined;
    return calculateFee(gasLimit.value, gasPrice.value).toString();
  });
  const feeToken = computed(() => {
    return ethToken.value;
  });

  const getTransactionParams = async () => {
    const client = await walletStore.getReadOnlyZkSyncClient();
    const { target, finalization } = await createFinalizationServices(client).fetchFinalization(
      transactionInfo.value.transactionHash as Hash
    );

    // Check if this is a custom bridge withdrawal
    // First check if the token already has the bridge address stored
    let l1BridgeAddress = transactionInfo.value.token.l1BridgeAddress;

    // If not, look it up from the custom bridge tokens configuration
    if (!l1BridgeAddress) {
      const { eraNetwork } = storeToRefs(providerStore);

      const customBridgeToken = customBridgeTokens.find(
        (token) =>
          token.l2Address.toLowerCase() === transactionInfo.value.token.address.toLowerCase() &&
          token.chainId === eraNetwork.value.l1Network?.id
      );

      l1BridgeAddress = customBridgeToken?.l1BridgeAddress;
    }

    const isCustomBridge = !!l1BridgeAddress;

    if (finalization.protocol === "interop-bundle") {
      if (isCustomBridge) throw new Error("Custom bridge withdrawals are not supported on this protocol version");
      return {
        address: target,
        abi: abi.IInteropHandlerABI,
        account: onboardStore.account.address!,
        functionName: "executeBundle",
        args: [finalization.params.bundle, finalization.params.proof],
      } as const;
    }

    const p = finalization.params;
    if (isCustomBridge) {
      // Use custom bridge finalization
      return {
        address: l1BridgeAddress as Address,
        abi: L1_BRIDGE_ABI,
        account: onboardStore.account.address!,
        functionName: "finalizeWithdrawal",
        args: [p.l2BatchNumber, p.l2MessageIndex, p.l2TxNumberInBatch, p.message, p.merkleProof],
      } as const;
    } else {
      // Use standard bridge finalization through L1Nullifier
      return {
        address: target,
        abi: abi.IL1NullifierABI,
        account: onboardStore.account.address!,
        functionName: "finalizeDeposit",
        args: [p],
      } as const;
    }
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
          return BigInt((await publicClient.estimateContractGas(transactionParams as any)).toString());
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
        ...(transactionParams as any),
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
