import { createEthersClient, createEthersSdk } from "@dutterbutter/zksync-sdk/ethers";
import { zeroAddress, type Address } from "viem";

import { useSentryLogger } from "@/composables/useSentryLogger";

import type { Token, TokenAmount } from "@/types";

export type DepositFeeValues = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  gasPerPubdata: bigint;
  baseCost: bigint;
  l1GasLimit: bigint;
  l2GasLimit: bigint;
};

export default (tokens: Ref<Token[]>, balances: Ref<TokenAmount[] | undefined>) => {
  const { getL1VoidSigner } = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();

  let params = {
    to: undefined as string | undefined,
    tokenAddress: undefined as string | undefined,
  };

  const fee = ref<DepositFeeValues | undefined>();
  const totalFee = computed(() => {
    if (!fee.value) return undefined;
    return (fee.value.l1GasLimit * fee.value.maxFeePerGas + fee.value.baseCost).toString();
  });
  const feeToken = computed(() => tokens.value.find((e) => e.address === zeroAddress));
  const feeTokenBalance = computed(() => balances.value?.find((e) => e.address === feeToken.value?.address)?.amount);

  const enoughBalanceToCoverFee = computed(() => {
    if (!totalFee.value || !feeTokenBalance.value || inProgress.value) return true;
    if (BigInt(totalFee.value) > BigInt(feeTokenBalance.value)) return false;
    return true;
  });

  const {
    inProgress,
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      if (!feeToken.value) throw new Error("Fee tokens is not available");
      if (!feeTokenBalance.value || feeTokenBalance.value?.toString() === "0") {
        // Can't estimate fee without ETH balance
        fee.value = undefined;
        return;
      }

      const signer = await getL1VoidSigner(true);

      try {
        const client = createEthersClient({ l1: signer.provider, l2: signer.providerL2, signer });
        const sdk = createEthersSdk(client);

        const quote = await sdk.deposits.quote({
          to: (params.to || signer.address) as Address,
          token: params.tokenAddress as Address,
          amount: BigInt(0n),
        });

        if (!quote.fees.gasLimit) {
          // Failed to estimate fee (e.g. 0 ETH balance)
          fee.value = undefined;
          return;
        }

        fee.value = {
          maxFeePerGas: quote.fees.maxFeePerGas,
          maxPriorityFeePerGas: quote.fees.maxPriorityFeePerGas,
          gasPerPubdata: quote.gasPerPubdata,
          baseCost: quote.baseCost,
          l1GasLimit: quote.fees.gasLimit,
          l2GasLimit: quote.suggestedL2GasLimit,
        };
      } catch (err) {
        captureException({
          error: err as Error,
          parentFunctionName: "executeEstimateFee",
          parentFunctionParams: [],
          filePath: "composables/zksync/deposit/useFee.ts",
        });
        throw err;
      }

      if (!fee.value) throw new Error("Fee estimation failed");

      // Apply 130% buffer to EIP-1559 parameters
      fee.value.maxFeePerGas = (fee.value.maxFeePerGas * 130n) / 100n;
      if (fee.value.maxPriorityFeePerGas) {
        fee.value.maxPriorityFeePerGas = (fee.value.maxPriorityFeePerGas * 130n) / 100n;
      }
      if (fee.value.l1GasLimit) {
        fee.value.l1GasLimit = (fee.value.l1GasLimit * 130n) / 100n;
      }

      // Apply 130% buffer to baseCost to prevent MsgValueTooLow errors
      fee.value.baseCost = (fee.value.baseCost * 130n) / 100n;
    },
    { cache: false }
  );
  const cacheEstimateFee = useTimedCache<void, [typeof params]>(() => {
    resetEstimateFee();
    return executeEstimateFee();
  }, 1000 * 8);

  return {
    fee,
    result: totalFee,
    inProgress,
    error,
    estimateFee: async (to: string, tokenAddress: string) => {
      params = {
        to,
        tokenAddress,
      };
      if (fee.value) {
        await cacheEstimateFee(params);
      } else {
        await executeEstimateFee();
      }
    },
    resetFee: () => {
      fee.value = undefined;
    },

    feeToken,
    feeTokenBalance,
    enoughBalanceToCoverFee,
  };
};
