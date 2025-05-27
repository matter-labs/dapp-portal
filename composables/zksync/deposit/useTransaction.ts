import { writeContract } from "@wagmi/core";
import { Contract, L1Signer } from "zksync-ethers";
import { getERC20DefaultBridgeData } from "zksync-ethers/build/utils";

import { useSentryLogger } from "@/composables/useSentryLogger";
import { L1_BRIDGE_ABI } from "@/data/abis/l1BridgeAbi";
import { wagmiConfig } from "@/data/wagmi";

import type { DepositFeeValues } from "@/composables/zksync/deposit/useFee";
import type { BigNumberish } from "ethers";

export default (getL1Signer: () => Promise<L1Signer | undefined>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const ethTransactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();

  const { validateAddress } = useScreening();

  const handleCustomBridgeDeposit = async (
    transaction: {
      to: string;
      tokenAddress: string;
      amount: BigNumberish;
      bridgeAddress: string;
      gasPerPubdataByte?: bigint;
      l2GasLimit?: bigint;
      refundRecipient?: string;
    },
    fee: DepositFeeValues
  ) => {
    const signer = eraWalletStore.getL1VoidSigner();

    if (!signer) return;

    const contract = new Contract(transaction.bridgeAddress, L1_BRIDGE_ABI, signer);

    const l2BridgeAddress = await contract.l2Bridge();

    const to = transaction.to;

    const bridgeData = await getERC20DefaultBridgeData(transaction.tokenAddress, signer._providerL1());

    const wallet = await getL1Signer();

    const l2GasLimit = await signer.providerL2.estimateCustomBridgeDepositL2Gas(
      transaction.bridgeAddress,
      l2BridgeAddress,
      transaction.tokenAddress,
      transaction.amount.toString(),
      to!,
      bridgeData,
      wallet!.address,
      transaction?.gasPerPubdataByte ?? 800n,
      0n
    );

    const baseCost = await signer.getBaseCost({
      gasLimit: l2GasLimit,
      gasPerPubdataByte: transaction.gasPerPubdataByte ?? 800n,
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

    const allowance = await signer.getAllowanceL1(transaction.tokenAddress, transaction.bridgeAddress);

    if (allowance < BigInt(transaction.amount)) {
      const approveTx = await signer.approveERC20(transaction.tokenAddress, transaction.amount, {
        bridgeAddress: transaction.bridgeAddress,
      });
      await approveTx.wait();
    }

    const hash = await writeContract(wagmiConfig, {
      address: transaction.bridgeAddress as `0x${string}`,
      abi: L1_BRIDGE_ABI,
      functionName: "deposit",
      args: [
        transaction.to,
        transaction.tokenAddress,
        transaction.amount,
        transaction.l2GasLimit ?? 400000n,
        transaction.gasPerPubdataByte ?? 800n,
        transaction.refundRecipient ?? "0x0000000000000000000000000000000000000000",
      ],
      value: baseCost + (overrides?.maxPriorityFeePerGas ? BigInt(overrides.maxPriorityFeePerGas!) : 0n),
    });

    return {
      from: wallet?.address,
      to: transaction.to,
      hash,
      // eslint-disable-next-line require-await
      wait: async () => ({
        from: wallet?.address,
        to: transaction.to,
        hash,
      }),
    };
  };

  const commitTransaction = async (
    transaction: {
      to: string;
      tokenAddress: string;
      amount: BigNumberish;
      bridgeAddress?: string;
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
        ethTransactionHash.value = depositResponse!.hash;
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

        ethTransactionHash.value = depositResponse.hash;
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
