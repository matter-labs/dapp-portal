import { useMemoize } from "@vueuse/core";
import { type BigNumberish } from "ethers";
import { EIP712_TX_TYPE } from "zksync-ethers/build/utils";

import { useSentryLogger } from "../useSentryLogger";
import { useSmartAccountDetection } from "../useSmartAccountDetection";

import type { Provider } from "zksync-ethers";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: string;
  tokenAddress: string;
  amount: BigNumberish;
  bridgeAddress?: string;
};

export default (getProvider: () => Provider) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<string | undefined>();
  const { walletCapabilities, detectWalletCapabilities } = useSmartAccountDetection();
  const { captureException } = useSentryLogger();

  const retrieveBridgeAddresses = useMemoize(() => getProvider().getDefaultBridgeAddresses());

  // Smart account compatible transaction submission
  const submitSmartAccountTransaction = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish }
  ) => {
    try {
      error.value = undefined;
      status.value = "processing";

      // Detect wallet capabilities if not already done
      if (walletCapabilities.value.walletType === "unknown") {
        await detectWalletCapabilities();
      }

      const provider = getProvider();
      const accountAddress = await provider.getDefaultAddress();

      if (transaction.type === "withdrawal") {
        return await handleSmartAccountWithdrawal(transaction, fee, provider, accountAddress);
      } else {
        return await handleSmartAccountTransfer(transaction, fee, provider, accountAddress);
      }
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
      captureException({
        error: err as Error,
        parentFunctionName: "submitSmartAccountTransaction",
        parentFunctionParams: [transaction, fee],
        filePath: "composables/zksync/useSmartAccountTransaction.ts",
      });
      throw err;
    }
  };

  const handleSmartAccountWithdrawal = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish },
    provider: Provider,
    _accountAddress: string
  ) => {
    const bridgeAddress = transaction.bridgeAddress || (await getDefaultBridgeAddress(transaction.tokenAddress));

    if (!bridgeAddress) {
      throw new Error("Bridge address not found for token");
    }

    // Create withdrawal transaction data
    const bridge = await provider.connectL2Bridge(bridgeAddress);
    const populatedTx = await bridge.withdraw.populateTransaction(
      transaction.to,
      transaction.tokenAddress,
      transaction.amount,
      {
        gasPrice: fee.gasPrice,
        gasLimit: fee.gasLimit,
        type: EIP712_TX_TYPE,
      }
    );

    // Use writeContract for smart accounts
    if (walletCapabilities.value.supportsWriteContract) {
      return await submitViaWriteContract(populatedTx, bridgeAddress);
    } else {
      throw new Error("Smart account doesn't support writeContract method");
    }
  };

  const handleSmartAccountTransfer = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish },
    provider: Provider,
    _accountAddress: string
  ) => {
    const populatedTx = await provider.getTransferTx({
      from: accountAddress,
      to: transaction.to,
      token: transaction.tokenAddress,
      amount: transaction.amount,
      overrides: {
        gasPrice: fee.gasPrice,
        gasLimit: fee.gasLimit,
      },
    });

    // Use writeContract for smart accounts
    if (walletCapabilities.value.supportsWriteContract) {
      return await submitViaWriteContract(populatedTx, populatedTx.to!);
    } else {
      throw new Error("Smart account doesn't support writeContract method");
    }
  };

  const submitViaWriteContract = async (populatedTx: any, contractAddress: string) => {
    status.value = "waiting-for-signature";

    // Get wallet client for writeContract
    const { getWalletClient } = await import("@wagmi/core");
    const walletClient = await getWalletClient();

    if (!walletClient?.writeContract) {
      throw new Error("Wallet client doesn't support writeContract");
    }

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
  };

  const getDefaultBridgeAddress = async (tokenAddress: string) => {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") return undefined;
    const bridgeAddresses = await retrieveBridgeAddresses();
    return bridgeAddresses.sharedL2;
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
    submitSmartAccountTransaction,
    walletCapabilities,
  };
};
