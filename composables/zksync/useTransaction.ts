import { useMemoize } from "@vueuse/core";
import { type BigNumberish } from "ethers";

import { isCustomNode } from "@/data/networks";

import { useSentryLogger } from "../useSentryLogger";

import type { TokenAmount } from "@/types";
import type { Provider, Signer } from "zksync-ethers";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: string;
  tokenAddress: string;
  amount: BigNumberish;
};

export const isWithdrawalManualFinalizationRequired = (_token: TokenAmount, l1NetworkId: number) => {
  return l1NetworkId === 1 || isCustomNode;
};

export default (getSigner: () => Promise<Signer | undefined>, getProvider: () => Provider) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();

  const retrieveBridgeAddresses = useMemoize(() => getProvider().getDefaultBridgeAddresses());
  const { validateAddress } = useScreening();

  const commitTransaction = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish }
  ) => {
    let accountAddress = "";
    try {
      error.value = undefined;

      status.value = "processing";
      const signer = await getSigner();
      if (!signer) throw new Error("ZKsync Signer is not available");

      accountAddress = await signer.getAddress();

      const provider = getProvider();

      const getRequiredBridgeAddress = async () => {
        if (transaction.tokenAddress === L2_BASE_TOKEN_ADDRESS) return undefined;
        const bridgeAddresses = await retrieveBridgeAddresses();
        return bridgeAddresses.sharedL2;
      };
      const bridgeAddress = transaction.type === "withdrawal" ? await getRequiredBridgeAddress() : undefined;

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      status.value = "waiting-for-signature";

      const txRequest = await provider[transaction.type === "transfer" ? "getTransferTx" : "getWithdrawTx"]({
        from: accountAddress,
        to: transaction.to,
        token: transaction.tokenAddress,
        amount: transaction.amount,
        bridgeAddress,
        overrides: {
          gasPrice: fee.gasPrice,
          gasLimit: fee.gasLimit,
        },
      });

      const txResponse = await signer.sendTransaction(txRequest);

      transactionHash.value = txResponse.hash;
      status.value = "done";

      return txResponse;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
      captureException({
        error: err as Error,
        parentFunctionName: "commitTransaction",
        parentFunctionParams: [transaction, fee],
        filePath: "composables/zksync/useTransaction.ts",
      });
    }
  };

  return {
    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
