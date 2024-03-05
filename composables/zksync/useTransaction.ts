import { useMemoize } from "@vueuse/core";
import { BigNumber, type BigNumberish } from "ethers";
import { parseEther } from "ethers/lib/utils";

import type { TokenAmount } from "@/types";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: string;
  tokenAddress: string;
  amount: BigNumberish;
};

export const isWithdrawalManualFinalizationRequired = (token: TokenAmount, l1NetworkId: number) => {
  return (
    token.address === ETH_TOKEN.address && BigNumber.from(token.amount).lt(parseEther("0.01")) && l1NetworkId === 1
  );
};

export default (getSigner: () => Promise<Signer | undefined>, getProvider: () => Provider) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();

  const retrieveBridgeAddresses = useMemoize(() => getProvider().getDefaultBridgeAddresses());
  const { validateAddress } = useScreening();

  const commitTransaction = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish }
  ) => {
    try {
      error.value = undefined;

      status.value = "processing";
      const signer = await getSigner();
      if (!signer) throw new Error("zkSync Signer is not available");

      const getRequiredBridgeAddress = async () => {
        if (transaction.tokenAddress === ETH_TOKEN.address) return undefined;
        const bridgeAddresses = await retrieveBridgeAddresses();
        return bridgeAddresses.erc20L2;
      };
      const bridgeAddress = transaction.type === "withdrawal" ? await getRequiredBridgeAddress() : undefined;

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      status.value = "waiting-for-signature";
      const tx = await signer[transaction.type === "transfer" ? "transfer" : "withdraw"]({
        to: transaction.to,
        token: transaction.tokenAddress === ETH_TOKEN.address ? ETH_TOKEN.l1Address! : transaction.tokenAddress,
        amount: transaction.amount,
        bridgeAddress,
        overrides: {
          gasPrice: fee.gasPrice,
          gasLimit: fee.gasLimit,
        },
      });

      transactionHash.value = tx.hash;
      status.value = "done";

      return tx;
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
    }
  };

  return {
    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
