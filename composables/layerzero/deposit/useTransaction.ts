import { getAddress, pad, type Address } from "viem";

import OFT_ABI from "./abi";

import type { DepositFeeValues } from "./useFee";
import type { TokenAmount } from "~/types";

export default () => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const ethTransactionHash = ref<string | undefined>();

  const onboardStore = useOnboardStore();
  const { account } = storeToRefs(onboardStore);

  const commitTransaction = async ({
    token,
    to,
    nativeFee,
    fee,
  }: {
    token: TokenAmount;
    to?: Address;
    nativeFee: bigint;
    fee: DepositFeeValues;
  }) => {
    error.value = undefined;
    status.value = "processing";

    console.log("commitTransaction", token, to, nativeFee);

    // Validate wallet and parameters
    const wallet = await onboardStore.getWallet();
    console.log("wallet", wallet);
    if (!wallet) throw new Error("Wallet is not available");
    if (!to || !token.address || !token.amount) {
      throw new Error("Invalid transaction parameters");
    }

    // Prepare fee overrides
    const overrides = {
      gasPrice: fee.gasPrice?.toBigInt(),
      gasLimit: fee.l1GasLimit.toBigInt(),
      maxFeePerGas: fee.maxFeePerGas?.toBigInt(),
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas?.toBigInt(),
    };

    // Clear gasPrice if maxFeePerGas is set
    if (overrides.gasPrice && overrides.maxFeePerGas) {
      overrides.gasPrice = undefined;
    }

    const amount = BigInt(token.amount);
    const toBytes32 = pad(getAddress(to), { size: 32 });

    // Prepare deposit parameters
    const sendParams = {
      dstEid: 30334, // sophon mainnet
      to: toBytes32,
      amountLD: amount,
      minAmountLD: amount,
      extraOptions: "0x",
      composeMsg: "0x",
      oftCmd: "0x",
    };
    console.log("sendParams", sendParams);
    try {
      status.value = "waiting-for-signature";

      console.log("write contract");
      const tx = await wallet.writeContract({
        address: token.address as `0x${string}`,
        abi: OFT_ABI,
        functionName: "send",
        args: [sendParams, { nativeFee, lzTokenFee: 0 }, account.value.address],
        value: nativeFee,
        gas: overrides.gasLimit,
        gasPrice: overrides.gasPrice,
        // maxFeePerGas: overrides.maxFeePerGas,
        // maxPriorityFeePerGas: overrides.maxPriorityFeePerGas,
      });

      console.log("tx", tx);

      ethTransactionHash.value = tx;
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
    ethTransactionHash,
    commitTransaction,
  };
};
