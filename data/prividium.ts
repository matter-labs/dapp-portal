import { createPrividiumChain } from "test-prividium-sdk";

import type { Transport } from "@wagmi/core";

const prividiumTestnetInstance = createPrividiumChain({
  chain: {
    id: 300,
    name: "Prividium Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorers: {
      default: {
        name: "Prividium Testnet Explorer",
        url: "https://block-explorer.era-prividium.zksync.dev/",
      },
    },
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
