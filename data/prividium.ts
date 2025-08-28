import { createPrividiumChain } from "@repo/prividium-sdk";

// import { l1Networks } from "@/data/networks";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Transport } from "@wagmi/core";

export const prividiumNetworks: ZkSyncNetwork[] = [
  {
    id: 300,
    key: "prividium-testnet",
    name: "Prividium Testnet",
    rpcUrl: "http://localhost:8001/rpc/public",
    blockExplorerUrl: "https://sepolia-era.zksync.network",
    blockExplorerApi: "https://block-explorer-api.sepolia.zksync.dev",
    // l1Network: l1Networks.sepolia,
    displaySettings: {
      onramp: false,
      showPartnerLinks: false,
      isTestnet: true,
    },
  },
];

const prividiumTestnetInstance = createPrividiumChain({
  chain: {
    id: 300,
    name: "Prividium Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    // blockExplorers: {
    //   default: {
    //     name: "Prividium Testnet Explorer",
    //     url: "https://testnet-explorer.prividium.io",
    //   },
    // },
  },
  clientId: "portal",
  rpcUrl: "http://localhost:8001/rpc",
  authBaseUrl: "http://localhost:3001",
  redirectUrl: `${window.location.origin}/callback`,
  onAuthExpiry: () => {
    const prividiumStore = usePrividiumStore();
    prividiumStore.onAuthExpiry();
  },
});

export const getPrividiumInstance = (chainId: number) => {
  if (chainId === prividiumTestnetInstance.chain.id) return prividiumTestnetInstance;
  return null;
};

export const getPrividiumTransport = (chainId: number): Transport | null => {
  if (chainId === prividiumTestnetInstance.chain.id) return prividiumTestnetInstance.transport as Transport;
  return null;
};
