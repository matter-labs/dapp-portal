import { prepareWithdrawalSteps } from "@/composables/zksync/withdrawalSteps";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish, ethers } from "ethers";
import type { Provider } from "zksync-ethers";
import type { Address } from "zksync-ethers/build/types";

export type FeeEstimationParams = {
  type: "transfer" | "withdrawal";
  from: string;
  to: string;
  tokenAddress: string;
  isNativeToken: boolean | null;
  amount: string;
};

export default (
  userAddress: ComputedRef<Address | undefined>,
  getProvider: () => Promise<Provider>,
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

  // We need to calculate gas limit with custom function since the new version of the SDK fails
  const getCustomGasLimit = async (transaction: {
    token: Address;
    amount: BigNumberish;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    overrides?: ethers.Overrides;
  }): Promise<bigint> => {
    const { ...tx } = transaction;
    if ((tx.to === null || tx.to === undefined) && (tx.from === null || tx.from === undefined)) {
      throw new Error("Withdrawal target address is undefined!");
    }
    tx.to ??= tx.from;
    tx.overrides ??= {};
    tx.overrides.from ??= tx.from;

    const provider = await getProvider();
    const bridge = await provider.connectL2Bridge(tx.bridgeAddress!);
    const populatedTx = await bridge.withdraw.populateTransaction(tx.to!, tx.token, tx.amount, tx.overrides);

    const gasLimit = await provider.estimateGas(populatedTx);

    return gasLimit;
  };

  const resetFee = () => {
    gasLimit.value = undefined;
    gasPrice.value = undefined;
  };

  const {
    inProgress,
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      if (!params) throw new Error("Params are not available");

      if (!userAddress.value) {
        resetFee();
        return;
      }

      const provider = await getProvider();
      const token = balances.value.find((e) => e.address === params!.tokenAddress);
      if (!token || token.amount === "0") {
        resetFee();
        return;
      }

      const tokenBalance = await provider.getBalance(userAddress.value, "latest", token.address); // Makes sure we have the latest balance amount
      if (!tokenBalance) {
        resetFee();
        return;
      }

      if (params.isNativeToken && +params!.amount <= 0) {
        resetFee();
        return;
      }

      const isCustomBridgeToken = !!token?.l2BridgeAddress;
      if (params.type === "withdrawal" && !isCustomBridgeToken) {
        const steps = await retry(() =>
          prepareWithdrawalSteps({
            token: params!.tokenAddress as `0x${string}`,
            // Tokens native to this chain are estimated with the approved amount, others with the whole balance
            amount: params!.isNativeToken ? BigInt(params!.amount) : BigInt(tokenBalance.toString()),
            to: params!.to as `0x${string}`,
          })
        );
        const withdrawal = steps[steps.length - 1];
        const [price, limits] = await Promise.all([
          withdrawal.maxFeePerGas ? BigInt(withdrawal.maxFeePerGas) : retry(() => provider.getGasPrice()),
          Promise.all(steps.map((step) => (step.gasLimit ? BigInt(step.gasLimit) : provider.estimateGas(step)))),
        ]);
        gasPrice.value = price;
        gasLimit.value = limits.reduce((total, limit) => total + limit, 0n);
        return;
      }

      const [price, limit] = await Promise.all([
        retry(() => provider.getGasPrice()),
        retry(() => {
          if (isCustomBridgeToken) {
            return getCustomGasLimit({
              from: params!.from,
              to: params!.to,
              token: params!.tokenAddress,
              amount: tokenBalance,
              bridgeAddress: token?.l2BridgeAddress,
            });
          }
          return provider.estimateGasTransfer({
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
    resetFee,

    feeToken,
    enoughBalanceToCoverFee,
  };
};
