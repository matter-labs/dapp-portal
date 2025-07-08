import { useMemoize } from "@vueuse/core";
import { Wallet } from "zksync-ethers";
import IL1Nullifier from "zksync-ethers/abi/IL1Nullifier.json";
import { IL1AssetRouter__factory as IL1AssetRouterFactory } from "zksync-ethers/build/typechain";

import { L1_BRIDGE_ABI } from "@/data/abis/l1BridgeAbi";
import { customBridgeTokens } from "@/data/customBridgeTokens";

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
    return ethToken.value;
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

    if (isCustomBridge) {
      // Use custom bridge finalization
      return {
        address: l1BridgeAddress as Hash,
        abi: L1_BRIDGE_ABI,
        account: onboardStore.account.address!,
        functionName: "finalizeWithdrawal",
        args: [
          BigInt(p.l1BatchNumber ?? 0n),
          BigInt(p.l2MessageIndex),
          Number(p.l2TxNumberInBlock) as number,
          p.message as `0x${string}`,
          p.proof as readonly `0x${string}`[],
        ],
      } as const;
    } else {
      // Use standard bridge finalization through L1Nullifier
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
