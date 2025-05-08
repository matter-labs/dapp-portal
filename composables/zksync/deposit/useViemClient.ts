import { createPublicClient, createWalletClient, custom, type Chain, type PublicClient, type WalletClient } from "viem";

type UseViemClientReturn = {
  publicClient?: PublicClient;
  walletClient?: WalletClient;
};

type UseViemClientParams = {
  chain?: Chain;
};

type UseViemClient = ({ chain }: UseViemClientParams) => UseViemClientReturn;

// Hook for managing all transaction fees
const useViemClient: UseViemClient = ({ chain }) => {
  if (!chain)
    return {
      walletClient: undefined,
      publicClient: undefined,
    };

  const { ethereum } = window as any;

  const walletClient = createWalletClient({
    chain,
    transport: custom(ethereum),
  });

  const publicClient = createPublicClient({
    chain,
    transport: custom(ethereum),
  });

  return {
    walletClient,
    publicClient,
  };
};

export { useViemClient };
