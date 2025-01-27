import { getAddress } from "@ethersproject/address";
import { hexZeroPad } from "@ethersproject/bytes";
import { BigNumber, type BigNumberish, Contract, ethers } from "ethers";
import { ref } from "vue";
import IERC20 from "zksync-ethers/abi/IERC20.json";

import usePromise from "~/composables/usePromise";

import LZ_OFT_HELPER_ABI from "./oftHelperAbi";

import type { Provider } from "zksync-ethers";
import type { Token } from "~/types";

export interface LayerZeroFeeValues {
  nativeFee: BigNumberish;
}

const OFT_HELPER_ADDRESS = "0x88172F3041Bd0787520dbc9Bd33D3d48e1fb46dc";

export type LayerZeroFeeParams = {
  type: "transfer" | "withdrawal";
  token: Token;
  amount: BigNumberish;
  from: string;
  to: string;
  fromChainId?: number;
  toChainId?: number;
};

export default (getL1Signer: () => Promise<any>, getProvider: () => Provider) => {
  const allowanceValue = ref<BigNumber | undefined>();
  const approvalNeeded = ref(false);
  const getEndpointId = (): number => {
    return 30101; // Ethereum mainnet
  };

  const toBytes32Address = (address: string): string => {
    return hexZeroPad(getAddress(address), 32);
  };

  async function checkApproval(
    tokenAddress: string,
    owner: string,
    spender: string,
    amount: BigNumberish
  ): Promise<boolean> {
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, IERC20, provider);
    const allowance = await tokenContract.allowance(owner, spender);
    allowanceValue.value = BigNumber.from(allowance);

    if (allowanceValue.value.isZero()) return false;

    const isApproved = allowanceValue.value.gte(amount);

    approvalNeeded.value = !isApproved;
    return isApproved;
  }

  let currentParams: LayerZeroFeeParams | undefined;
  const result = ref<LayerZeroFeeValues | undefined>();
  const gasLimit = ref<BigNumberish | undefined>();
  const gasPrice = ref<BigNumberish | undefined>();

  const {
    inProgress,
    error,
    execute: executeEstimateFee,
  } = usePromise(
    async () => {
      if (!currentParams) throw new Error("Fee estimation params not set");
      const params = currentParams;
      const wallet = await getL1Signer();
      const provider = getProvider();

      if (!wallet) throw new Error("No provider available");
      if (!provider) throw new Error("No provider available");

      const dstChainId = getEndpointId();
      const toAddressBytes32 = toBytes32Address(params.to);
      // L2 to L1
      const helperContract = new Contract(OFT_HELPER_ADDRESS, LZ_OFT_HELPER_ABI, wallet);
      const sendParam = {
        dstEid: dstChainId, // Ethereum mainnet
        to: toAddressBytes32,
        amountLD: params.amount,
        minAmountLD: params.amount,
        extraOptions: "0x",
        composeMsg: "0x",
        oftCmd: "0x",
      };
      // Get quote first
      const { nativeFee } = await helperContract.quoteSend(params.token.address, sendParam);
      const [price, limit] = await Promise.all([
        // Get gas price
        provider.getGasPrice(),
        // Get gas limit
        helperContract.estimateGas.send(params.token.address, sendParam),
      ]);
      gasPrice.value = price;
      gasLimit.value = limit;
      result.value = { nativeFee };
    },
    { cache: false }
  );

  return {
    gasLimit,
    gasPrice,
    result,
    inProgress,
    error,
    estimateFee: async (estimationParams: LayerZeroFeeParams) => {
      currentParams = estimationParams;
      const isApproved = await checkApproval(
        estimationParams.token.address,
        estimationParams.from,
        OFT_HELPER_ADDRESS,
        estimationParams.amount
      );
      if (!isApproved) return;
      await executeEstimateFee();
    },
  };
};
