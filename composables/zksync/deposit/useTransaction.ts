import type { DepositFeeValues } from "@/composables/zksync/deposit/useFee";
import type { BigNumberish } from "ethers";
import type { L1Signer } from "zksync-ethers";

export default (getL1Signer: () => Promise<L1Signer | undefined>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const ethTransactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();

  const { validateAddress } = useScreening();

  const commitTransaction = async (
    transaction: {
      to: string;
      tokenAddress: string;
      amount: BigNumberish;
    },
    fee: DepositFeeValues
  ) => {
    let accountAddress = "";
    try {
      error.value = undefined;

      status.value = "processing";
      const wallet = await getL1Signer();
      if (!wallet) throw new Error("Wallet is not available");
      accountAddress = wallet.address;

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      const overrides = {
        gasPrice: fee.gasPrice,
        gasLimit: fee.l1GasLimit,
        maxFeePerGas: fee.maxFeePerGas,
        maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
      };
      if (overrides.gasPrice && overrides.maxFeePerGas) {
        overrides.gasPrice = undefined;
      }

      status.value = "waiting-for-signature";
      const depositResponse = await wallet.deposit({
        to: transaction.to,
        token: transaction.tokenAddress,
        amount: transaction.amount,
        l2GasLimit: fee.l2GasLimit,
        approveBaseERC20: true,
        overrides,
      });

      ethTransactionHash.value = depositResponse.hash;
      status.value = "done";
      return depositResponse;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
      sentryCaptureException({
        error: err as Error,
        parentFunctionName: "commitTransaction",
        parentFunctionParams: [transaction, fee],
        accountAddress: accountAddress || "",
        filePath: "composables/zksync/deposit/useTransaction.ts",
      });
    }
  };

  return {
    status,
    error,
    ethTransactionHash,
    commitTransaction,
  };
};
