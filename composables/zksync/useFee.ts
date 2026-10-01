import { estimateGas } from "@wagmi/core";
import { AbiCoder } from "ethers";
import { encodeFunctionData } from "viem";
import { EIP712_TX_TYPE } from "zksync-ethers/build/utils";

import { wagmiConfig } from "@/data/wagmi";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish, ethers } from "ethers";
import type { Provider } from "zksync-ethers";
import type { Address, PaymasterParams } from "zksync-ethers/build/types";

export type FeeEstimationParams = {
  type: "transfer" | "withdrawal";
  from: string;
  to: string;
  tokenAddress: string;
  isNativeToken: boolean | null;
  assetId?: string | null;
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
  // Only the latest estimate is applied. An estimate started for previous inputs, e.g. another token or recipient,
  // is discarded
  let latestEstimateId = 0;
  const inProgress = ref(false);

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

    const provider = await getProvider();
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

  // Returns undefined when there is nothing to estimate, e.g. the token balance is 0
  const getFee = async (
    estimationParams: FeeEstimationParams,
    accountAddress: Address | undefined
  ): Promise<{ gasPrice: bigint; gasLimit: bigint } | undefined> => {
    if (!accountAddress) return undefined;

    const provider = await getProvider();
    const token = balances.value.find((e) => e.address === estimationParams.tokenAddress);
    if (!token || token.amount === "0") return undefined;

    const tokenBalance = await provider.getBalance(accountAddress, "latest", token.address); // Makes sure we have the latest balance amount
    if (!tokenBalance) return undefined;

    if (estimationParams.isNativeToken && +estimationParams.amount <= 0) return undefined;

    const [price, limit] = await Promise.all([
      retry(() => provider.getGasPrice()),
      retry(() => {
        const isCustomBridgeToken = !!token?.l2BridgeAddress;
        if (isCustomBridgeToken) {
          return getCustomGasLimit({
            from: estimationParams.from,
            to: estimationParams.to,
            token: estimationParams.tokenAddress,
            amount: tokenBalance,
            bridgeAddress: token?.l2BridgeAddress,
          });
        } else if (estimationParams.isNativeToken && estimationParams.assetId) {
          const assetData = AbiCoder.defaultAbiCoder().encode(
            ["uint256", "address", "address"],
            [estimationParams.amount, estimationParams.to, estimationParams.tokenAddress]
          );

          // Define the specific withdraw function as there are two
          // defined on the Asset Router Contract
          const withdrawFunction = {
            inputs: [
              { internalType: "bytes32", name: "_assetId", type: "bytes32" },
              { internalType: "bytes", name: "_assetData", type: "bytes" },
            ],
            name: "withdraw",
            outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
            stateMutability: "nonpayable",
            type: "function",
          };

          return estimateGas(wagmiConfig, {
            to: L2_ASSET_ROUTER_ADDRESS,
            data: encodeFunctionData({
              abi: [withdrawFunction],
              functionName: "withdraw",
              args: [estimationParams.assetId, assetData],
            }),
          });
        } else {
          return provider[estimationParams.type === "transfer" ? "estimateGasTransfer" : "estimateGasWithdraw"]({
            from: estimationParams.from,
            to: estimationParams.to,
            token: estimationParams.tokenAddress,
            amount: tokenBalance,
          });
        }
      }),
    ]);
    return { gasPrice: price, gasLimit: limit };
  };

  const {
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      if (!params) throw new Error("Params are not available");

      // The inputs are read once, since they can change while the estimate is in progress
      const estimationParams = params;
      const accountAddress = userAddress.value;
      const estimateId = ++latestEstimateId;
      const isLatestEstimate = () => estimateId === latestEstimateId;
      inProgress.value = true;
      try {
        const result = await getFee(estimationParams, accountAddress);
        if (!isLatestEstimate()) return;
        gasPrice.value = result?.gasPrice;
        gasLimit.value = result?.gasLimit;
      } catch (err) {
        // A failed estimate for previous inputs does not replace the state of the latest one
        if (isLatestEstimate()) throw err;
      } finally {
        if (isLatestEstimate()) inProgress.value = false;
      }
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
    inProgress: computed(() => inProgress.value),
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
