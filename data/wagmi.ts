import { useStorage } from "@vueuse/core";
import { fallback, http } from "@wagmi/core";
import { type Chain, zksyncSepoliaTestnet } from "@wagmi/core/chains";
import { defaultWagmiConfig } from "@web3modal/wagmi";
import { chainConfig, zksync } from "viem/zksync";

import { chainList, defaultNetwork, type ZkSyncNetwork } from "@/data/networks";
import { getPrividiumTransport } from "@/data/prividium";

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
    nativeCurrency: network.nativeCurrency ?? { name: "Ether", symbol: "ETH", decimals: 18 },
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
    ...chainConfig,
  };
};

/* TODO: fix this very hacky hack */
const identifyNetworkByQueryParam = () => {
  const networkUsesLocalStorage = useStorage<boolean>("networkUsesLocalStorage", false);
  const selectedNetworkKey = useStorage<string>(
    "selectedNetwork",
    defaultNetwork.key,
    networkUsesLocalStorage.value ? window.localStorage : window.sessionStorage
  );
  const networkFromQueryParam = new URLSearchParams(window.location.search).get("network");
  if (networkFromQueryParam && chainList.some((e) => e.key === networkFromQueryParam)) {
    return chainList.find((e) => e.key === networkFromQueryParam);
  }
  if (selectedNetworkKey.value && chainList.some((e) => e.key === selectedNetworkKey.value)) {
    return chainList.find((e) => e.key === selectedNetworkKey.value);
  }
  return null;
};

const getAllChains = () => {
  type ChainData = { config: ZkSyncNetwork; chain: Chain; isL1: boolean };
  const chains: ChainData[] = [];
  const addUniqueChain = (config: ZkSyncNetwork, chain: Chain, isL1: boolean) => {
    if (!chains.some((existingChain) => existingChain.config.key === config.key)) {
      chains.push({ config, chain, isL1 });
    }
  };
  for (const config of chainList) {
    addUniqueChain(config, (!config.isPrividium && useExistingEraChain(config)) || formatZkSyncChain(config), false);
    if (config.l1Network) {
      addUniqueChain(config, config.l1Network, true);
    }
  }

  const uniqueChains: ChainData[] = [];
  chains.forEach((e) => {
    if (!uniqueChains.some((existing) => existing.chain.id === e.chain.id)) {
      uniqueChains.push(e);
    }
  });

  /*
    The issue is that if some prividium chain runs on same chain id
    2 chains with same chain id will end up in the list
    this causes all sorts of issues, especially with wagmi.
    We need to make sure we don't include e.g. prividium on zk sepolia but just zk sepolia
    or vice versa when prividium chain is selected
  */
  const hackyCurrentNetwork = identifyNetworkByQueryParam();
  if (hackyCurrentNetwork) {
    return [
      {
        config: hackyCurrentNetwork,
        chain: formatZkSyncChain(hackyCurrentNetwork),
        isL1: false,
      },
      ...uniqueChains.filter((e) => e.chain.id !== hackyCurrentNetwork.id),
    ];
  }

  return uniqueChains;
};

// Creates a fallback transport for a particular chain.
const chainTransports = (config: ZkSyncNetwork, chain: Chain, isL1: boolean) => {
  if (!isL1 && config.isPrividium) {
    const prividiumTransport = getPrividiumTransport(chain.id);
    if (!prividiumTransport) {
      throw new Error(`Prividium config not found for chain ${chain.id}`);
    }
    return prividiumTransport;
  }

  // We expect all the transports to support batch requests.
  const httpTransports = chain.rpcUrls.default.http.map((e) => http(e, { batch: true }));
  return fallback(httpTransports);
};

const chains = getAllChains();
export const wagmiConfig = defaultWagmiConfig({
  chains: chains.map((e) => e.chain) as unknown as readonly [Chain, ...Chain[]],
  transports: Object.fromEntries(
    chains.map(({ config, chain, isL1 }) => [chain.id, chainTransports(config, chain, isL1)])
  ),
  projectId: portalRuntimeConfig.walletConnectProjectId,
  metadata,
  enableCoinbase: false,
});
