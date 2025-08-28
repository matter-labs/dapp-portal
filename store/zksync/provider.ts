import { FetchRequest } from "ethers";
import { Provider } from "zksync-ethers";

export const useZkSyncProviderStore = defineStore("zkSyncProvider", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());
  const { waitForAuthentication, getPrividiumInstance } = usePrividiumStore();
  const { isAuthenticated } = storeToRefs(usePrividiumStore());
  let provider: Provider | undefined;

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
        provider = new Provider(r);
      } else {
        provider = new Provider(selectedNetwork.value.rpcUrl);
      }
    }
    return provider;
  };

  return {
    eraNetwork: selectedNetwork,

    requestProvider,

    blockExplorerUrl: computed(() => selectedNetwork.value.blockExplorerUrl),
  };
});
