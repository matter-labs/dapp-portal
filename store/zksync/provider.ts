import { FetchRequest } from "ethers";
import { Provider } from "zksync-ethers";

import { chainList, type SettlementChain } from "@/data/networks";

export const useZkSyncProviderStore = defineStore("zkSyncProvider", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const { waitForAuthentication, getPrividiumInstance, onAuthExpiry } = usePrividiumStore();
  const { isAuthenticated } = storeToRefs(usePrividiumStore());
  let provider: Provider | undefined;
  const settlementProviders: Map<number, Provider> = new Map();

  // Get settlement chains for the current network
  const settlementChains = computed(() => {
    return selectedNetwork.value.settlementChains || [];
  });

  watch(isAuthenticated, (authenticated) => {
    if (authenticated) return;
    provider = undefined;
  });
  const requestProvider = async () => {
    if (!provider) {
      const prividiumInstance = getPrividiumInstance();
      if (prividiumInstance) {
        await waitForAuthentication();
        const r = new FetchRequest(prividiumInstance.chain.rpcUrls.default.http[0]);
        const headers = prividiumInstance.getAuthHeaders() || {};
        for (const [key, value] of Object.entries(headers)) {
          r.setHeader(key, value);
        }

        let destroyed = false;
        // eslint-disable-next-line require-await
        r.processFunc = async (_req, resp) => {
          if (!resp.ok()) {
            const code = resp.statusCode;
            if (!destroyed && code === 403) {
              destroyed = true;
              onAuthExpiry();
            }
          }
          return resp;
        };
        // eslint-disable-next-line require-await
        r.preflightFunc = async (req) => {
          if (destroyed) throw new Error("Request aborted due to authentication expiry");
          return req;
        };
        provider = new Provider(r);
      } else {
        provider = new Provider(selectedNetwork.value.rpcUrl);
      }
    }
    return provider;
  };

  // Get provider for a specific settlement chain
  const getSettlementProvider = (chainId: number) => {
    if (!settlementProviders.has(chainId)) {
      // Find the settlement chain configuration
      const settlementChain = settlementChains.value.find((chain) => chain.chainId === chainId);
      if (!settlementChain) {
        throw new Error(`Settlement chain with ID ${chainId} not found in configuration`);
      }

      // Find the actual network configuration for this settlement chain
      const network = chainList.find((net) => net.id === chainId);
      if (!network) {
        throw new Error(`Network configuration for settlement chain ${chainId} not found`);
      }

      const settlementProvider = new Provider(network.rpcUrl);
      settlementProviders.set(chainId, settlementProvider);
    }
    return settlementProviders.get(chainId)!;
  };

  // Check if settlement layer has executed on any settlement chain
  const checkSettlementLayerExecution = async (ethExecuteTxHash: string | null): Promise<boolean> => {
    if (!ethExecuteTxHash) return false;

    try {
      // Check all settlement chains to see if the transaction has been executed
      for (const settlementChain of settlementChains.value) {
        try {
          const isExecuted = await checkTransactionOnSettlementChain(settlementChain, ethExecuteTxHash);
          if (isExecuted) {
            return true;
          }
        } catch (error) {
          // Continue to next settlement chain if this one fails
          continue;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  };

  // Helper function to check transaction on a specific settlement chain
  const checkTransactionOnSettlementChain = async (
    settlementChain: SettlementChain,
    ethExecuteTxHash: string
  ): Promise<boolean> => {
    // First, try zkSync-style getTransactionDetails (for Gateway chains)
    try {
      const network = chainList.find((net) => net.id === settlementChain.chainId);
      if (network && network.blockExplorerApi) {
        const settlementProvider = getSettlementProvider(settlementChain.chainId);
        const settlementTransactionDetails = await settlementProvider.getTransactionDetails(ethExecuteTxHash);

        if (settlementTransactionDetails && settlementTransactionDetails.status === "verified") {
          return true;
        }
      }
    } catch (error) {
      // If getTransactionDetails fails, try Ethereum-style receipt check
    }

    // Second, try Ethereum-style getTransactionReceipt (for L1 chains)
    try {
      let client;

      // Use appropriate client based on chain ID
      if (selectedNetwork.value.l1Network && settlementChain.chainId === selectedNetwork.value.l1Network.id) {
        // Use the configured L1 client for the current network's L1
        const onboardStore = useOnboardStore();
        client = onboardStore.getPublicClient();
      } else {
        // For other settlement chains, create a client from the network config
        const network = chainList.find((net) => net.id === settlementChain.chainId);
        if (network) {
          const { createPublicClient, http } = await import("viem");
          client = createPublicClient({
            transport: http(network.rpcUrl),
          });
        }
      }

      if (client) {
        const receipt = await client.getTransactionReceipt({
          hash: ethExecuteTxHash as `0x${string}`,
        });
        if (receipt && receipt.status === "success") {
          return true;
        }
      }
    } catch (error) {
      // Both methods failed, transaction not found on this chain
    }

    return false;
  };

  return {
    eraNetwork: selectedNetwork,
    settlementChains,
    requestProvider,
    getSettlementProvider,
    checkSettlementLayerExecution,
    blockExplorerUrl: computed(() => selectedNetwork.value.blockExplorerUrl),
  };
});
