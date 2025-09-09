import { createPrividiumChain } from "test-prividium-sdk";

import type { Transport } from "@wagmi/core";

const prividiumTestnetInstance = createPrividiumChain({
  chain: {
    id: 300,
    name: "Prividium Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    blockExplorers: {
      default: {
        name: "Prividium Era Testnet Explorer",
        url: "https://block-explorer.era-prividium.zksync.dev",
      },
    },
  },
  clientId: "portal",
  rpcUrl: "https://proxy.era-prividium.zksync.dev/rpc",
  authBaseUrl: "https://user-panel.era-prividium.zksync.dev",
  permissionsApiBaseUrl: "https://permissions-api.era-prividium.zksync.dev",
  redirectUrl: `${window.location.origin}/callback`,
  scope: ["wallet:required"],
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
