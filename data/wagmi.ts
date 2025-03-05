import { fallback, http } from "@wagmi/core";
import { type Chain, zksync, zksyncSepoliaTestnet } from "@wagmi/core/chains";
import { defaultWagmiConfig } from "@web3modal/wagmi";

import { chainList, type ZkSyncNetwork } from "@/data/networks";

const portalRuntimeConfig = usePortalRuntimeConfig();

const metadata = {
  name: "ZKsync Portal",
  description: "ZKsync Portal - view balances, transfer and bridge tokens",
  url: "https://portal.zksync.io",
  icons: ["https://portal.zksync.io/icon.png"],
};

if (!portalRuntimeConfig.walletConnectProjectId) {
  throw new Error("WALLET_CONNECT_PROJECT_ID is not set. Please set it in .env file");
}

const useExistingEraChain = (network: ZkSyncNetwork) => {
  const existingNetworks = [zksync, zksyncSepoliaTestnet];
  return existingNetworks.find((existingNetwork) => existingNetwork.id === network.id);
};
const formatZkSyncChain = (network: ZkSyncNetwork) => {
  return {
    id: network.id,
    name: network.name,
    network: network.key,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: [network.rpcUrl] },
      public: { http: [network.rpcUrl] },
    },
    blockExplorers: network.blockExplorerUrl
      ? {
          default: {
            name: "Explorer",
            url: network.blockExplorerUrl,
          },
        }
      : undefined,
  };
};

const getAllChains = () => {
  const chains: Chain[] = [];
  const addUniqueChain = (chain: Chain) => {
    if (!chains.some((existingChain) => existingChain.id === chain.id)) {
      chains.push(chain);
    }
  };
  for (const network of chainList) {
    addUniqueChain(useExistingEraChain(network) ?? formatZkSyncChain(network));
    if (network.l1Network) {
      addUniqueChain(network.l1Network);
    }
  }

  return chains;
};

// Creates a fallback transport for a particular chain.
const chainTransports = (chain: Chain) => {
  // We expect all the transports to support batch requests.
  const httpTransports = chain.rpcUrls.default.http.map((e) => http(e, { batch: true }));
  return fallback(httpTransports);
};

const chains = getAllChains();
export const wagmiConfig = defaultWagmiConfig({
  chains: getAllChains() as any,
  transports: Object.fromEntries(chains.map((chain) => [chain.id, chainTransports(chain)])),
  projectId: portalRuntimeConfig.walletConnectProjectId,
  metadata,
  enableCoinbase: false,
});
