import { readContract, writeContract } from "@wagmi/core";
import { zeroAddress, type Address, type Hash } from "viem";
import { L1Signer } from "zksync-ethers";
import { getERC20DefaultBridgeData, REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT } from "zksync-ethers/build/utils";

import { useSentryLogger } from "@/composables/useSentryLogger";
import { L1_BRIDGE_ABI } from "@/data/abis/l1BridgeAbi";
import { wagmiConfig } from "@/data/wagmi";

import type { DepositFeeValues } from "@/composables/zksync/deposit/useFee";
import type { BigNumberish } from "ethers";

export default (getL1Signer: () => Promise<L1Signer | undefined>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const ethTransactionHash = ref<Hash | undefined>();
  const eraWalletStore = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();

  const { validateAddress } = useScreening();

  const handleCustomBridgeDeposit = async (
    transaction: {
      to: Address;
      tokenAddress: Address;
      amount: BigNumberish;
      bridgeAddress: Address;
      gasPerPubdata?: bigint;
      l2GasLimit?: bigint;
      refundRecipient?: Address;
    },
    fee: DepositFeeValues
  ) => {
    const l1Signer = await getL1Signer();
    if (!l1Signer) throw new Error("L1 signer is not available");

    const l2BridgeAddress = await readContract(wagmiConfig, {
      address: transaction.bridgeAddress as Address,
      abi: L1_BRIDGE_ABI,
      functionName: "l2Bridge",
    });
    const bridgeData = await getERC20DefaultBridgeData(transaction.tokenAddress, l1Signer.provider);

    const gasPerPubdata = transaction.gasPerPubdata ?? BigInt(REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT);
    const l2Value = 0n; // L2 value is not used in this context
    const l2GasLimit = await l1Signer.providerL2.estimateCustomBridgeDepositL2Gas(
      transaction.bridgeAddress,
      l2BridgeAddress,
      transaction.tokenAddress,
      transaction.amount.toString(),
      transaction.to,
      bridgeData,
      l1Signer.address,
      gasPerPubdata,
      l2Value
    );

    const baseCost = await l1Signer.getBaseCost({
      gasLimit: l2GasLimit,
      gasPerPubdataByte: gasPerPubdata,
    });

    const overrides = {
      gasPrice: fee.gasPrice,
      gasLimit: fee.l1GasLimit,
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
    };
    if (overrides.gasPrice && overrides.maxFeePerGas) {
      overrides.gasPrice = undefined;
    }

    const hash = await writeContract(wagmiConfig, {
      address: transaction.bridgeAddress as Address,
      abi: L1_BRIDGE_ABI,
      functionName: "deposit",
      args: [
        transaction.to,
        transaction.tokenAddress,
        BigInt(transaction.amount.toString()),
        transaction.l2GasLimit ?? 400000n,
        gasPerPubdata,
        transaction.refundRecipient ?? zeroAddress,
      ],
      value: baseCost + (overrides.maxPriorityFeePerGas ? BigInt(overrides.maxPriorityFeePerGas) : 0n),
    });

    return {
      from: l1Signer.address,
      to: transaction.to,
      hash,
      // eslint-disable-next-line require-await
      wait: async () => ({
        from: l1Signer.address,
        to: transaction.to,
        hash,
      }),
    };
  };

  const commitTransaction = async (
    transaction: {
      to: Address;
      tokenAddress: Address;
      amount: BigNumberish;
      bridgeAddress?: Address;
    },
    fee: DepositFeeValues
  ) => {
    try {
      error.value = undefined;

      status.value = "processing";
      const wallet = await getL1Signer();
      if (!wallet) throw new Error("Wallet is not available");

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

      if (transaction.bridgeAddress) {
        const depositResponse = await handleCustomBridgeDeposit(
          { ...transaction, bridgeAddress: transaction.bridgeAddress },
          fee
        );
        ethTransactionHash.value = depositResponse.hash;
        status.value = "done";
        return depositResponse;
      } else {
        const depositResponse = await wallet.deposit({
          to: transaction.to,
          token: transaction.tokenAddress,
          amount: transaction.amount,
          l2GasLimit: fee.l2GasLimit,
          approveBaseERC20: true,
          overrides,
        });

        ethTransactionHash.value = depositResponse.hash as Hash;
        status.value = "done";
        return depositResponse;
      }
    } catch (err) {
      error.value = formatError(err as Error);
      status.value = "not-started";
      captureException({
        error: err as Error,
        parentFunctionName: "commitTransaction",
        parentFunctionParams: [transaction, fee],
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
