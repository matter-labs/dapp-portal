import { useMemoize } from "@vueuse/core";
import { ethers, type BigNumberish, type ContractTransaction } from "ethers";
import { EIP712_TX_TYPE } from "zksync-ethers/build/utils";

import { isCustomNode } from "@/data/networks";
import { L2_BASE_TOKEN_ADDRESS } from "@/utils/constants";

import { useSentryLogger } from "../useSentryLogger";

import type { TokenAmount } from "@/types";
import type { Provider, Signer } from "zksync-ethers";
import type { Address, PaymasterParams } from "zksync-ethers/build/types";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: string;
  tokenAddress: string;
  amount: BigNumberish;
  bridgeAddress?: string;
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

  // We need to calculate gas limit with custom function since the new version of the SDK fails
  const getCustomWithdrawTx = async (transaction: {
    token: Address;
    amount: BigNumberish;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    paymasterParams?: PaymasterParams;
    overrides?: ethers.Overrides;
  }): Promise<ContractTransaction> => {
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

    return populatedTx;
  };

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
        if (transaction.bridgeAddress) return transaction.bridgeAddress;
        if (transaction.tokenAddress === L2_BASE_TOKEN_ADDRESS) return undefined;
        const bridgeAddresses = await retrieveBridgeAddresses();
        return bridgeAddresses.sharedL2;
      };
      const bridgeAddress = transaction.type === "withdrawal" ? await getRequiredBridgeAddress() : undefined;

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      status.value = "waiting-for-signature";

      if (transaction.bridgeAddress && transaction.type !== "transfer") {
        const txRequest = await getCustomWithdrawTx({
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

        try {
          // Try the standard sendTransaction first
          const txResponse = await signer.sendTransaction(txRequest);
          transactionHash.value = txResponse.hash;
          status.value = "done";
          return txResponse;
        } catch (sendTxError: any) {
          // If sendTransaction fails (e.g., smart account), fallback to writeContract
          if (
            sendTxError.message?.includes("Unsupported methods") ||
            sendTxError.message?.includes("eth_sendRawTransaction")
          ) {
            // console.log("sendTransaction failed, falling back to writeContract for smart account");
            return await submitViaWriteContract(txRequest, bridgeAddress!);
          }
          throw sendTxError;
        }
      }

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

      try {
        // Try the standard sendTransaction first
        const txResponse = await signer.sendTransaction(txRequest);
        transactionHash.value = txResponse.hash;
        status.value = "done";
        return txResponse;
      } catch (sendTxError: any) {
        // If sendTransaction fails (e.g., smart account), fallback to writeContract
        if (
          sendTxError.message?.includes("Unsupported methods") ||
          sendTxError.message?.includes("eth_sendRawTransaction")
        ) {
          // console.log("sendTransaction failed, falling back to writeContract for smart account");
          return await submitViaWriteContract(txRequest, txRequest.to!);
        }
        throw sendTxError;
      }
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
      captureException({
        error: err as Error,
        parentFunctionName: "commitTransaction",
        parentFunctionParams: [transaction, fee],
        filePath: "composables/zksync/useTransaction.ts",
      });
      throw err;
    }
  };

  // Fallback method using writeContract for smart accounts
  const submitViaWriteContract = async (populatedTx: any, contractAddress: string) => {
    status.value = "waiting-for-signature";

    try {
      // Get wallet client for writeContract
      const { getWalletClient } = await import("@wagmi/core");
      const walletClient = await getWalletClient();

      if (!walletClient?.writeContract) {
        throw new Error("Wallet client doesn't support writeContract");
      }

      // For smart accounts, we need to use the wallet's execute method
      // This is the standard pattern for smart accounts like Fireblocks
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: "target", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
            name: "execute",
            outputs: [{ name: "", type: "bytes" }],
            stateMutability: "payable",
            type: "function",
          },
        ],
        functionName: "execute",
        args: [
          contractAddress, // target contract
          populatedTx.value || 0n, // value
          populatedTx.data, // transaction data
        ],
        value: populatedTx.value || 0n,
        gas: BigInt(populatedTx.gasLimit?.toString() || "0"),
      });

      transactionHash.value = hash;
      status.value = "done";

      return {
        hash,
        wait: () => walletClient.waitForTransactionReceipt({ hash }),
      };
    } catch (error: any) {
      // console.error("writeContract fallback failed:", error);
      throw new Error(`Smart account transaction failed: ${error.message}`);
    }
  };

  const formatError = (error: Error): Error => {
    // Format error messages for better user experience
    if (error.message.includes("Unsupported methods")) {
      return new Error(
        "This wallet type doesn't support direct transaction signing. Please use a different wallet or contact support."
      );
    }
    return error;
  };

  return {
    status,
    error,
    transactionHash,
    commitTransaction,
  };
};
