import { parseEther } from "ethers";
import { utils } from "zksync-ethers";

import { useSentryLogger } from "@/composables/useSentryLogger";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

export type DepositFeeValues = {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  gasPrice?: bigint;
  baseCost?: bigint;
  l1GasLimit: bigint;
  l2GasLimit?: bigint;
};

export default (tokens: Ref<Token[]>, balances: Ref<TokenAmount[] | undefined>) => {
  const { getPublicClient } = useOnboardStore();
  const { getL1VoidSigner } = useZkSyncWalletStore();
  const { requestProvider } = useZkSyncProviderStore();
  const { captureException } = useSentryLogger();
  const networkStore = useNetworkStore();

  // Check if current L1 network is BSC
  const isBscNetwork = computed(() => {
    return networkStore.selectedNetwork?.l1Network?.id === 97; // BSC Testnet
  });

  let params = {
    to: undefined as string | undefined,
    tokenAddress: undefined as string | undefined,
  };

  const fee = ref<DepositFeeValues | undefined>();
  const recommendedBalance = ref<BigNumberish | undefined>();

  const totalFee = computed(() => {
    if (!fee.value) return undefined;

    try {
      // Always use legacy gas price for BSC compatibility
      if (fee.value.l1GasLimit && fee.value.gasPrice) {
        // Validate values before BigInt operations
        if (fee.value.l1GasLimit === null || fee.value.gasPrice === null) {
          return undefined;
        }

        const gasFee = calculateFee(fee.value.l1GasLimit, fee.value.gasPrice);
        const baseCost = fee.value.baseCost || 0n;

        return String(gasFee + baseCost);
      }

      // Fallback for EIP-1559 (should not be used with our BSC fixes)
      if (fee.value.l1GasLimit && fee.value.maxFeePerGas && fee.value.maxPriorityFeePerGas) {
        return String(fee.value.l1GasLimit * fee.value.maxFeePerGas + (fee.value.baseCost || 0n));
      }

      return undefined;
    } catch (error) {
      captureException({
        error: error as Error,
        parentFunctionName: "totalFee",
        parentFunctionParams: [],
        filePath: "composables/zksync/deposit/useFee.ts",
      });
      return undefined;
    }
  });

  const feeToken = computed(() => {
    return tokens.value.find((e) => e.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase());
  });
  const enoughBalanceToCoverFee = computed(() => {
    if (!feeToken.value || !balances.value || inProgress.value) {
      return true;
    }
    const feeTokenBalance = balances.value.find((e) => e.address === feeToken.value!.address);
    if (!feeTokenBalance) return true;

    try {
      if (totalFee.value && feeTokenBalance.amount) {
        // Add null checks before BigInt conversion
        if (
          totalFee.value === null ||
          feeTokenBalance.amount === null ||
          totalFee.value === undefined ||
          feeTokenBalance.amount === undefined
        ) {
          return true; // Assume sufficient balance if we can't determine
        }

        const feeAmount = BigInt(totalFee.value);
        const balanceAmount = BigInt(feeTokenBalance.amount);

        return balanceAmount >= feeAmount;
      }
    } catch (error) {
      captureException({
        error: error as Error,
        parentFunctionName: "enoughBalanceToCoverFee",
        parentFunctionParams: [],
        filePath: "composables/zksync/deposit/useFee.ts",
      });
      return true; // Assume sufficient balance on error
    }

    return true;
  });

  const getEthTransactionFee = async () => {
    const signer = await getL1VoidSigner();
    if (!signer) throw new Error("Signer is not available");

    try {
      const feeData = await retry(() =>
        signer.getFullRequiredDepositFee({
          token: utils.ETH_ADDRESS,
          to: params.to,
        })
      );

      // Validate fee data to prevent null BigInt conversion
      if (!feeData) {
        throw new Error("Fee data is null from zksync signer");
      }

      // Check for null values in fee data and provide fallbacks
      if (feeData.l1GasLimit === null || feeData.l1GasLimit === undefined) {
        feeData.l1GasLimit = BigInt(utils.L1_RECOMMENDED_MIN_ETH_DEPOSIT_GAS_LIMIT || 150000);
      }

      // For BSC, ensure EIP-1559 fields are properly handled
      if (feeData.maxFeePerGas === null) {
        feeData.maxFeePerGas = undefined;
      }
      if (feeData.maxPriorityFeePerGas === null) {
        feeData.maxPriorityFeePerGas = undefined;
      }

      return feeData;
    } catch (error) {
      captureException({
        error: error as Error,
        parentFunctionName: "getEthTransactionFee",
        parentFunctionParams: [],
        filePath: "composables/zksync/deposit/useFee.ts",
      });
      // Fallback to ERC20 fee structure for BSC compatibility
      return {
        l1GasLimit: BigInt(utils.L1_RECOMMENDED_MIN_ETH_DEPOSIT_GAS_LIMIT || 150000),
        baseCost: BigInt("250000000000000"), // 0.00025 ETH fallback base cost
      };
    }
  };
  const getERC20TransactionFee = () => {
    return {
      l1GasLimit: BigInt(utils.L1_RECOMMENDED_MIN_ERC20_DEPOSIT_GAS_LIMIT),
    };
  };
  const getGasPrice = async () => {
    try {
      const gasPrice = await retry(() => getPublicClient().getGasPrice());
      if (!gasPrice || gasPrice === null || gasPrice === undefined) {
        // BSC Testnet fallback gas price (5 gwei)
        return (BigInt("5000000000") * 130n) / 100n; // 6.5 gwei with buffer
      }
      return (BigInt(gasPrice) * 130n) / 100n;
    } catch (error) {
      captureException({
        error: error as Error,
        parentFunctionName: "getGasPrice",
        parentFunctionParams: [],
        filePath: "composables/zksync/deposit/useFee.ts",
      });
      // BSC Testnet fallback gas price (5 gwei)
      return (BigInt("5000000000") * 130n) / 100n; // 6.5 gwei with buffer
    }
  };
  const {
    inProgress,
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      recommendedBalance.value = undefined;
      if (!feeToken.value) throw new Error("Fee tokens is not available");

      const provider = await requestProvider();
      const isEthBasedChain = await provider.isEthBasedChain();

      try {
        if (isBscNetwork.value) {
          // For BSC network, always use ERC20 fee structure for better compatibility
          fee.value = getERC20TransactionFee();
        } else if (isEthBasedChain && params.tokenAddress === feeToken.value?.address) {
          fee.value = await getEthTransactionFee();
        } else {
          fee.value = getERC20TransactionFee();
        }
      } catch (err) {
        const message = (err as any)?.message;
        if (message?.startsWith("Not enough balance for deposit!")) {
          const match = message.match(/([\d\\.]+) ETH/);
          if (feeToken.value && match?.length) {
            const ethAmount = match[1].split(" ")?.[0];
            recommendedBalance.value = parseEther(ethAmount);
            return;
          }
        } else if (message?.includes("insufficient funds for gas * price + value")) {
          throw new Error("Insufficient funds to cover deposit fee! Please, top up your account with ETH.");
        }
        captureException({
          error: err as Error,
          parentFunctionName: "executeEstimateFee",
          parentFunctionParams: [],
          filePath: "composables/zksync/deposit/useFee.ts",
        });
        throw err;
      }
      /* Force legacy gas price for BSC network compatibility */
      if (fee.value) {
        // Always use legacy gas price, ignore EIP-1559 parameters
        fee.value.gasPrice = await getGasPrice();
        fee.value.maxFeePerGas = undefined;
        fee.value.maxPriorityFeePerGas = undefined;

        // Apply 130% buffer to gas limit
        if (fee.value.l1GasLimit) {
          fee.value.l1GasLimit = (fee.value.l1GasLimit * 130n) / 100n;
        }
      }

      // Apply 130% buffer to baseCost to prevent MsgValueTooLow errors
      if (fee.value?.baseCost) {
        fee.value.baseCost = (fee.value.baseCost * 130n) / 100n;
      }
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
    recommendedBalance,
    estimateFee: async (to: string, tokenAddress: string) => {
      params = {
        to,
        tokenAddress,
      };
      await cacheEstimateFee(params);
    },
    resetFee: () => {
      fee.value = undefined;
    },

    feeToken,
    enoughBalanceToCoverFee,
  };
};
