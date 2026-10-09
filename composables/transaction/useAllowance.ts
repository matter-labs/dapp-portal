import { createEthersSdk } from "@matterlabs/zksync-js/ethers";
import { Contract, type BigNumberish } from "ethers";
import { L1Signer, utils } from "zksync-ethers";
import IERC20 from "zksync-ethers/abi/IERC20.json";

import { useSentryLogger } from "../useSentryLogger";

import type { Hash, TokenAllowance } from "@/types";
import type { Address } from "viem";

export default (
  accountAddress: Ref<string | undefined>,
  tokenAddress: Ref<string | undefined>,
  getContractAddress: () => Promise<string | undefined>,
  getL1Signer: () => Promise<L1Signer | undefined>
) => {
  const { getPublicClient } = useOnboardStore();
  const { getReadOnlyZkSyncClient } = useZkSyncWalletStore();
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
    if (
      accountAddress.value &&
      tokenAddress.value &&
      tokenAddress.value !== utils.ETH_ADDRESS &&
      tokenAddress.value !== L2_BASE_TOKEN_ADDRESS
    ) {
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
        if (!wallet) throw new Error("Wallet is not available");
        setAllowanceStatus.value = "waiting-for-signature";

        const receipts = [];

        for (let i = 0; i < approvalAmounts.length; i++) {
          const { token, spender, allowance } = approvalAmounts[i];
          const txResponse = await new Contract(token, IERC20, wallet).approve(spender, allowance);

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
  // Only the approvals still missing for this deposit, including the base token for mintValue on non-ETH chains
  const getApprovalAmounts = async (amount: BigNumberish) => {
    const quote = await createEthersSdk(await getReadOnlyZkSyncClient()).deposits.quote({
      token: tokenAddress.value as Address,
      amount: BigInt(amount.toString()),
    });

    approvalAmounts = quote.approvalsNeeded.map(({ token, spender, amount }) => ({
      token,
      spender,
      allowance: amount,
    }));

    return approvalAmounts;
  };

  const setAllowance = async (amount: BigNumberish) => {
    await getApprovalAmounts(amount);
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
