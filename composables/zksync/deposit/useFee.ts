import { isETH } from "@matterlabs/zksync-js";
import { createEthersSdk } from "@matterlabs/zksync-js/ethers";
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
  // On chains with a non-ETH base token, baseCost is paid in the base token, not ETH
  baseCostInEth: boolean;
};

export default (tokens: Ref<Token[]>, balances: Ref<TokenAmount[] | undefined>) => {
  const { getReadOnlyZkSyncClient } = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();

  let params = {
    to: undefined as string | undefined,
    tokenAddress: undefined as string | undefined,
  };

  const fee = ref<DepositFeeValues | undefined>();
  const totalFee = computed(() => {
    if (!fee.value) return undefined;
    const l1Fee = fee.value.l1GasLimit * fee.value.maxFeePerGas;
    return (fee.value.baseCostInEth ? l1Fee + fee.value.baseCost : l1Fee).toString();
  });
  const baseTokenFee = computed(() => {
    if (!fee.value || fee.value.baseCostInEth) return undefined;
    return fee.value.baseCost.toString();
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

      try {
        const client = await getReadOnlyZkSyncClient();
        const sender = (await client.signer.getAddress()) as Address;
        const quote = await createEthersSdk(client).deposits.quote({
          to: (params.to || sender) as Address,
          token: params.tokenAddress as Address,
          amount: 0n,
        });
        const { l1, l2 } = quote.fees;

        // Until approvals land the SDK can't estimate the bridge tx and quotes a fixed 3M gas limit instead
        if (!l1?.gasLimit || !l2 || quote.approvalsNeeded.length) {
          // Failed to estimate fee (e.g. 0 ETH balance)
          fee.value = undefined;
          return;
        }

        fee.value = {
          maxFeePerGas: l1.maxFeePerGas,
          maxPriorityFeePerGas: l1.maxPriorityFeePerGas ?? 0n,
          gasPerPubdata: l2.gasPerPubdata,
          baseCost: l2.total,
          l1GasLimit: l1.gasLimit,
          l2GasLimit: l2.gasLimit,
          baseCostInEth: isETH(quote.fees.token),
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
    baseTokenFee,
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
