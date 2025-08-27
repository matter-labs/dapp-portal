import { Provider } from "zksync-ethers";

import { chainList } from "@/data/networks";

export const useZkSyncProviderStore = defineStore("zkSyncProvider", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  let provider: Provider | undefined;
  let gatewayProvider: Provider | undefined;

  // Automatically select the correct Gateway network based on current network
  const selectedGatewayNetwork = computed(() => {
    const currentNetwork = selectedNetwork.value;
    const currentL1Network = currentNetwork.l1Network;

    // Find the Gateway network that matches the current L1 network
    return chainList.find(
      (network) => network.key.includes("gateway") && network.l1Network?.id === currentL1Network?.id
    );
  });

  const requestProvider = () => {
    if (!provider) {
      provider = new Provider(selectedNetwork.value.rpcUrl);
    }
    return provider;
  };

  const requestGatewayProvider = () => {
    if (!gatewayProvider) {
      if (!selectedGatewayNetwork.value) {
        throw new Error("Gateway network configuration not found");
      }
      gatewayProvider = new Provider(selectedGatewayNetwork.value.rpcUrl);
    }
    return gatewayProvider;
  };

  return {
    eraNetwork: selectedNetwork,
    selectedGatewayNetwork,
    requestProvider,
    requestGatewayProvider,
    blockExplorerUrl: computed(() => selectedNetwork.value.blockExplorerUrl),
  };
});
