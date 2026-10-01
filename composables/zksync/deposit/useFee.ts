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

  let params = {
    to: undefined as string | undefined,
    tokenAddress: undefined as string | undefined,
    // The fee is estimated with the signer of the sender, so estimates are cached per sender
    from: undefined as string | undefined,
  };

  const fee = ref<DepositFeeValues | undefined>();
  const recommendedBalance = ref<BigNumberish | undefined>();
  // Only the latest estimate is applied. An estimate started for previous inputs, e.g. another token, is discarded
  let latestEstimateId = 0;
  const inProgress = ref(false);

  const totalFee = computed(() => {
    if (!fee.value) return undefined;

    if (fee.value.l1GasLimit && fee.value.maxFeePerGas && fee.value.maxPriorityFeePerGas) {
      return String(fee.value.l1GasLimit * fee.value.maxFeePerGas + (fee.value.baseCost || 0n));
    } else if (fee.value.l1GasLimit && fee.value.gasPrice) {
      return calculateFee(fee.value.l1GasLimit, fee.value.gasPrice).toString();
    }
    return undefined;
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
    if (totalFee.value && BigInt(totalFee.value) > BigInt(feeTokenBalance.amount)) {
      return false;
    }
    return true;
  });

  const getEthTransactionFee = async (to: string | undefined) => {
    const signer = await getL1VoidSigner();
    if (!signer) throw new Error("Signer is not available");

    return await retry(() =>
      signer.getFullRequiredDepositFee({
        token: utils.ETH_ADDRESS,
        to,
      })
    );
  };
  const getERC20TransactionFee = (): DepositFeeValues => {
    return {
      l1GasLimit: BigInt(utils.L1_RECOMMENDED_MIN_ERC20_DEPOSIT_GAS_LIMIT),
    };
  };
  const getGasPrice = async () => {
    return (BigInt(await retry(() => getPublicClient().getGasPrice())) * 130n) / 100n;
  };
  // Returns either the fee or, when the balance is too low to estimate it, the recommended balance
  const getDepositFee = async (
    to: string | undefined,
    tokenAddress: string | undefined
  ): Promise<{ fee?: DepositFeeValues; recommendedBalance?: BigNumberish }> => {
    if (!feeToken.value) throw new Error("Fee tokens is not available");

    const provider = await requestProvider();
    const isEthBasedChain = await provider.isEthBasedChain();

    let depositFee: DepositFeeValues;
    try {
      if (isEthBasedChain && tokenAddress === feeToken.value?.address) {
        depositFee = await getEthTransactionFee(to);
      } else {
        depositFee = getERC20TransactionFee();
      }
    } catch (err) {
      const message = (err as any)?.message;
      if (message?.startsWith("Not enough balance for deposit!")) {
        const match = message.match(/([\d\\.]+) ETH/);
        if (feeToken.value && match?.length) {
          const ethAmount = match[1].split(" ")?.[0];
          return { recommendedBalance: parseEther(ethAmount) };
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
    /* It can be either maxFeePerGas or gasPrice */
    if (!depositFee.maxFeePerGas) {
      depositFee.gasPrice = await getGasPrice();
    } else {
      // Apply 130% buffer to EIP-1559 parameters
      depositFee.maxFeePerGas = (depositFee.maxFeePerGas * 130n) / 100n;
      if (depositFee.maxPriorityFeePerGas) {
        depositFee.maxPriorityFeePerGas = (depositFee.maxPriorityFeePerGas * 130n) / 100n;
      }
      if (depositFee.l1GasLimit) {
        depositFee.l1GasLimit = (depositFee.l1GasLimit * 130n) / 100n;
      }
    }

    // Apply 130% buffer to baseCost to prevent MsgValueTooLow errors
    if (depositFee.baseCost) {
      depositFee.baseCost = (depositFee.baseCost * 130n) / 100n;
    }
    return { fee: depositFee };
  };
  const {
    error,
    execute: executeEstimateFee,
    reset: resetEstimateFee,
  } = usePromise(
    async () => {
      const estimateId = ++latestEstimateId;
      const isLatestEstimate = () => estimateId === latestEstimateId;
      const { to, tokenAddress } = params;
      inProgress.value = true;
      recommendedBalance.value = undefined;
      try {
        const result = await getDepositFee(to, tokenAddress);
        if (!isLatestEstimate()) return;
        recommendedBalance.value = result.recommendedBalance;
        if (result.fee) fee.value = result.fee;
      } catch (err) {
        // A failed estimate for previous inputs does not replace the state of the latest one
        if (isLatestEstimate()) throw err;
      } finally {
        if (isLatestEstimate()) inProgress.value = false;
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
    inProgress: computed(() => inProgress.value),
    error,
    recommendedBalance,
    estimateFee: async (to: string, tokenAddress: string, from: string) => {
      params = {
        to,
        tokenAddress,
        from,
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
