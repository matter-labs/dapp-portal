import { L1Signer, utils } from "zksync-ethers";
import IERC20 from "zksync-ethers/abi/IERC20.json";

import { useSentryLogger } from "../useSentryLogger";

import type { DepositFeeValues } from "../zksync/deposit/useFee";
import type { Hash, TokenAllowance } from "@/types";
import type { BigNumberish } from "ethers";

export default (
  accountAddress: Ref<string | undefined>,
  tokenAddress: Ref<string | undefined>,
  getContractAddress: () => Promise<string | undefined>,
  getL1Signer: () => Promise<L1Signer | undefined>
) => {
  const { getPublicClient } = useOnboardStore();
  const { captureException } = useSentryLogger();
  const {
    result,
    inProgress,
    error,
    execute: getAllowance,
    reset,
  } = usePromise(
    async () => {
      if (!accountAddress.value) throw new Error("Account address is not available");

      const contractAddress = await getContractAddress();
      if (!contractAddress) throw new Error("Contract address is not available");

      const publicClient = getPublicClient();
      const allowance = (await publicClient!.readContract({
        address: tokenAddress.value as Hash,
        abi: IERC20,
        functionName: "allowance",
        args: [accountAddress.value, contractAddress],
      })) as bigint;
      return BigInt(allowance);
    },
    { cache: false }
  );

  const requestAllowance = async () => {
    if (accountAddress.value && tokenAddress.value && tokenAddress.value !== utils.ETH_ADDRESS) {
      await getAllowance();
    } else {
      reset();
    }
  };

  let approvalAmounts: TokenAllowance[] = [];
  const setAllowanceStatus = ref<"not-started" | "processing" | "waiting-for-signature" | "sending" | "done">(
    "not-started"
  );
  const setAllowanceTransactionHashes = ref<(Hash | undefined)[]>([]);

  const {
    result: setAllowanceReceipts,
    inProgress: setAllowanceInProgress,
    error: setAllowanceError,
    execute: executeSetAllowance,
    reset: resetExecuteSetAllowance,
  } = usePromise(
    async () => {
      try {
        setAllowanceStatus.value = "processing";
        if (!accountAddress.value) throw new Error("Account address is not available");

        const contractAddress = await getContractAddress();
        if (!contractAddress) throw new Error("Contract address is not available");

        const wallet = await getL1Signer();
        setAllowanceStatus.value = "waiting-for-signature";

        const receipts = [];

        for (let i = 0; i < approvalAmounts.length; i++) {
          const txResponse = await wallet?.approveERC20(approvalAmounts[i].token, approvalAmounts[i].allowance);

          setAllowanceTransactionHashes.value.push(txResponse?.hash as Hash);

          setAllowanceStatus.value = "sending";

          const receipt = await retry(
            () =>
              getPublicClient().waitForTransactionReceipt({
                hash: setAllowanceTransactionHashes.value[i]!,
                onReplaced: (replacement) => {
                  setAllowanceTransactionHashes.value[i] = replacement.transaction.hash;
                },
              }),
            {
              retries: 3,
              delay: 5_000,
            }
          );

          receipts.push(receipt);
        }

        await requestAllowance();

        setAllowanceStatus.value = "done";
        return receipts;
      } catch (err) {
        setAllowanceStatus.value = "not-started";
        captureException({
          error: err as Error,
          parentFunctionName: "executeSetAllowance",
          parentFunctionParams: [],
          filePath: "composables/transaction/useAllowance.ts",
        });
        throw err;
      }
    },
    { cache: false }
  );
  const getApprovalAmounts = async (amount: BigNumberish, fee: DepositFeeValues) => {
    const wallet = await getL1Signer();
    if (!wallet) throw new Error("Wallet is not available");

    // We need to pass the overrides in order to get the correct deposits allowance params
    const overrides = {
      gasPrice: fee.gasPrice,
      gasLimit: fee.l1GasLimit,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
    };
    if (overrides.gasPrice && overrides.maxFeePerGas) {
      overrides.gasPrice = undefined;
    }

    approvalAmounts = (await wallet.getDepositAllowanceParams(
      tokenAddress.value!,
      amount,
      overrides
    )) as TokenAllowance[];

    return approvalAmounts;
  };

  const setAllowance = async (amount: BigNumberish, fee: DepositFeeValues) => {
    await getApprovalAmounts(amount, fee);
    await executeSetAllowance();
  };

  const resetSetAllowance = () => {
    approvalAmounts = [];
    setAllowanceStatus.value = "not-started";
    setAllowanceTransactionHashes.value = [];
    resetExecuteSetAllowance();
  };

  watch(
    [accountAddress, tokenAddress],
    () => {
      requestAllowance();
      resetSetAllowance();
    },
    { immediate: true }
  );

  return {
    result: computed(() => result.value),
    inProgress: computed(() => inProgress.value),
    error: computed(() => error.value),
    requestAllowance,

    setAllowanceTransactionHashes,
    setAllowanceReceipts,
    setAllowanceStatus,
    setAllowanceInProgress,
    setAllowanceError,
    setAllowance,
    resetSetAllowance,
    getApprovalAmounts,
  };
};
