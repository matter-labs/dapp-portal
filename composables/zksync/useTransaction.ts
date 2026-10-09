import { getWalletClient, getPublicClient, prepareTransactionRequest, custom } from "@wagmi/core";
import { ethers, type BigNumberish, type ContractTransaction, type TransactionRequest } from "ethers";
import { createWalletClient, type Hash, type Address } from "viem";
import { eip712WalletActions } from "viem/zksync";

import { prepareWithdrawalSteps } from "@/composables/zksync/withdrawalSteps";
import { isCustomNode } from "@/data/networks";
import { wagmiConfig } from "~/data/wagmi";

import { useSentryLogger } from "../useSentryLogger";

import type { TokenAmount } from "@/types";
import type { Provider, Signer } from "zksync-ethers";

type TransactionParams = {
  type: "transfer" | "withdrawal";
  to: Address;
  tokenAddress: Address;
  amount: BigNumberish;
  bridgeAddress?: Address;
};

export const isWithdrawalManualFinalizationRequired = (_token: TokenAmount, l1NetworkId: number) => {
  return l1NetworkId === 1 || isCustomNode;
};

// @zksyncos removes use of 712 tx type, and paymaster usage (not supported in zksyncos)

export default (getSigner: () => Promise<Signer | undefined>, getProvider: () => Promise<Provider>) => {
  const status = ref<"not-started" | "processing" | "waiting-for-signature" | "done">("not-started");
  const error = ref<Error | undefined>();
  const transactionHash = ref<string | undefined>();
  const eraWalletStore = useZkSyncWalletStore();
  const { captureException } = useSentryLogger();
  const { selectedNetwork } = storeToRefs(useNetworkStore());

  const { validateAddress } = useScreening();

  // We need to calculate gas limit with custom function since the new version of the SDK fails
  const getCustomWithdrawTx = async (transaction: {
    token: Address;
    amount: BigNumberish;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    overrides?: ethers.Overrides;
  }): Promise<ContractTransaction> => {
    const { ...tx } = transaction;
    if ((tx.to === null || tx.to === undefined) && (tx.from === null || tx.from === undefined)) {
      throw new Error("Withdrawal target address is undefined!");
    }
    tx.to ??= tx.from;
    tx.overrides ??= {};
    tx.overrides.from ??= tx.from;

    const provider = await getProvider();
    const bridge = await provider.connectL2Bridge(tx.bridgeAddress!);
    const populatedTx = await bridge.withdraw.populateTransaction(tx.to!, tx.token, tx.amount, tx.overrides);

    return populatedTx;
  };

  const sendTransaction = async (signer: Signer, txRequest: TransactionRequest): Promise<{ hash: string }> => {
    if (!selectedNetwork.value.isPrividium) {
      return await signer.sendTransaction(txRequest);
    }

    const wagmiClient = await getWalletClient(wagmiConfig);
    if (!wagmiClient) throw new Error("Wagmi client is not available");
    const { getPrividiumInstance } = usePrividiumStore();

    const prividiumInstance = getPrividiumInstance();
    if (!prividiumInstance) throw new Error("Prividium instance is not available");
    const wagmiPublicClient = getPublicClient(wagmiConfig, {
      chainId: prividiumInstance.chain.id,
    });
    if (!wagmiPublicClient) throw new Error("Wagmi public client is not available");

    const prepared = await prepareTransactionRequest(wagmiConfig, {
      chainId: wagmiClient.chain.id,
      account: wagmiClient.account,
      to: txRequest.to as Address,
      data: txRequest.data as Hash,
      value: BigInt(txRequest.value || 0) as bigint,
    });

    const client = createWalletClient({
      account: wagmiClient.account,
      chain: prividiumInstance.chain,
      transport: custom({
        async request({ method, params }) {
          const response = await wagmiClient.transport.request({ method, params });
          return response;
        },
      }),
    }).extend(eip712WalletActions());
    const signature = await client.signTransaction({
      ...prepared,
      type: "eip712" as any,
    });

    return {
      hash: await wagmiPublicClient.sendRawTransaction({ serializedTransaction: signature }),
    };
  };

  const commitTransaction = async (
    transaction: TransactionParams,
    fee: { gasPrice: BigNumberish; gasLimit: BigNumberish }
  ) => {
    let accountAddress = "" as Address;
    try {
      error.value = undefined;

      status.value = "processing";
      const signer = await getSigner();
      if (!signer) throw new Error("ZKsync Signer is not available");

      accountAddress = (await signer.getAddress()) as Address;

      const provider = await getProvider();

      await eraWalletStore.walletAddressValidate();
      await validateAddress(transaction.to);

      status.value = "waiting-for-signature";

      if (transaction.bridgeAddress && transaction.type !== "transfer") {
        const txRequest = await getCustomWithdrawTx({
          from: accountAddress,
          to: transaction.to,
          token: transaction.tokenAddress,
          amount: transaction.amount,
          bridgeAddress: transaction.bridgeAddress,
          overrides: {
            gasPrice: fee.gasPrice,
            gasLimit: fee.gasLimit,
          },
        });

        const txResponse = await signer.sendTransaction(txRequest);

        transactionHash.value = txResponse.hash;
        status.value = "done";

        return txResponse;
      }

      if (transaction.type === "withdrawal") {
        const steps = await prepareWithdrawalSteps({
          token: transaction.tokenAddress,
          amount: BigInt(transaction.amount.toString()),
          to: transaction.to,
        });
        let txResponse: { hash: string } | undefined;
        for (const [index, step] of steps.entries()) {
          txResponse = await sendTransaction(signer, step);
          // An approval has to be mined before the withdrawal spends it
          if (index < steps.length - 1) await provider.waitForTransaction(txResponse.hash);
        }
        transactionHash.value = txResponse!.hash;
        status.value = "done";
        return txResponse;
      }

      const txRequest = await provider.getTransferTx({
        from: accountAddress,
        to: transaction.to,
        token: transaction.tokenAddress,
        amount: transaction.amount,
        overrides: {
          gasPrice: fee.gasPrice,
          gasLimit: fee.gasLimit,
        },
      });

      const txResponse = await sendTransaction(signer, txRequest);
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
