import { type Provider } from "zksync-ethers";

import type { Token, TokenAmount } from "@/types";

export type FeeEstimationParams = {
  type: "transfer" | "withdrawal";
  from: string;
  to: string;
  tokenAddress: string;
};

export default (
  getProvider: () => Provider,
  tokens: Ref<{ [tokenSymbol: string]: Token } | undefined>,
  balances: Ref<TokenAmount[]>
) => {
  let params: FeeEstimationParams | undefined;

  const gasLimit = ref<bigint | undefined>();
  const gasPrice = ref<bigint | undefined>();

  const totalFee = computed(() => {
    if (!gasLimit.value || !gasPrice.value) return undefined;
    return calculateFee(gasLimit.value, gasPrice.value).toString();
  });

  const feeToken = computed(() => {
    return tokens.value?.[L2_BASE_TOKEN_ADDRESS];
  });
  const enoughBalanceToCoverFee = computed(() => {
    if (!feeToken.value || inProgress.value) {
      return true;
    }
    const feeTokenBalance = balances.value.find((e) => e.address === feeToken.value!.address);
    if (!feeTokenBalance) return true;
    if (totalFee.value && BigInt(totalFee.value) > BigInt(feeTokenBalance.amount)) {
      return false;
    }
    return true;
  });

  const {
    inProgress,
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      if (!params) throw new Error("Params are not available");

      const provider = getProvider();
      const tokenBalance = balances.value.find((e) => e.address === params!.tokenAddress)?.amount || "1";
      const [price, limit] = await Promise.all([
        retry(() => provider.getGasPrice()),
        retry(() => {
          return provider[params!.type === "transfer" ? "estimateGasTransfer" : "estimateGasWithdraw"]({
            from: params!.from,
            to: params!.to,
            token: params!.tokenAddress,
            amount: tokenBalance,
          });
        }),
      ]);
      gasPrice.value = price;
      gasLimit.value = limit;
    },
    { cache: false }
  );
  const cacheEstimateFee = useTimedCache<void, [FeeEstimationParams]>(() => {
    resetEstimateFee();
    return executeEstimateFee();
  }, 1000 * 8);

  return {
    gasLimit,
    gasPrice,
    result: totalFee,
    inProgress,
    error,
    estimateFee: async (estimationParams: FeeEstimationParams) => {
      params = estimationParams;
      await cacheEstimateFee(params);
    },
    resetFee: () => {
      gasLimit.value = undefined;
      gasPrice.value = undefined;
    },

    feeToken,
    enoughBalanceToCoverFee,
  };
};
