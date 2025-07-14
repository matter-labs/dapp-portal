import { EIP712_TX_TYPE } from "zksync-ethers/build/utils";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish, ethers } from "ethers";
import type { Provider } from "zksync-ethers";
import type { Address, PaymasterParams } from "zksync-ethers/build/types";

export type FeeEstimationParams = {
  type: "transfer" | "withdrawal";
  from: string;
  to: string;
  tokenAddress: string;
};

export default (
  userAddress: ComputedRef<Address | undefined>,
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

  // We need to calculate gas limit with custom function since the new version of the SDK fails
  const getCustomGasLimit = async (transaction: {
    token: Address;
    amount: BigNumberish;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    paymasterParams?: PaymasterParams;
    overrides?: ethers.Overrides;
  }): Promise<bigint> => {
    const { ...tx } = transaction;
    if ((tx.to === null || tx.to === undefined) && (tx.from === null || tx.from === undefined)) {
      throw new Error("Withdrawal target address is undefined!");
    }
    tx.to ??= tx.from;
    tx.overrides ??= {};
    tx.overrides.from ??= tx.from;
    tx.overrides.type ??= EIP712_TX_TYPE;

    const provider = getProvider();
    const bridge = await provider.connectL2Bridge(tx.bridgeAddress!);
    let populatedTx = await bridge.withdraw.populateTransaction(tx.to!, tx.token, tx.amount, tx.overrides);
    if (tx.paymasterParams) {
      populatedTx = {
        ...populatedTx,
        customData: {
          paymasterParams: tx.paymasterParams,
        },
      };
    }

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

      const provider = getProvider();
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

      const [price, limit] = await Promise.all([
        retry(() => provider.getGasPrice()),
        retry(() => {
          const isCustomBridgeToken = !!token?.l2BridgeAddress;
          if (isCustomBridgeToken) {
            return getCustomGasLimit({
              from: params!.from,
              to: params!.to,
              token: params!.tokenAddress,
              amount: tokenBalance,
              bridgeAddress: token?.l2BridgeAddress,
            });
          } else {
            return provider[params!.type === "transfer" ? "estimateGasTransfer" : "estimateGasWithdraw"]({
              from: params!.from,
              to: params!.to,
              token: params!.tokenAddress,
              amount: tokenBalance,
            });
          }
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
