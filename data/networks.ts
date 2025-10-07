import { mainnet, sepolia } from "@wagmi/core/chains";

import Hyperchains from "@/hyperchains/config.json";
import { type Config } from "@/scripts/hyperchains/common";

import type { Token } from "@/types";
import type { Chain } from "@wagmi/core/chains";

const portalRuntimeConfig = usePortalRuntimeConfig();

// We don't use RPC tokens here, since the expectation is that public quota is enough to cover all the requests.
// We provide several RPC URLs to deal with the case when one of them is down.
// The expectation is that "more reliable" RPCs are listed first.
export const l1Networks = {
  mainnet: {
    ...mainnet,
    name: "Ethereum",
    network: "mainnet",
    rpcUrls: {
      default: {
        http: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
      },
    },
  },
  sepolia: {
    ...sepolia,
    name: "Ethereum Sepolia Testnet",
    rpcUrls: {
      default: {
        http: ["https://ethereum-sepolia-rpc.publicnode.com", "https://rpc.sepolia.org"],
      },
    },
  },
} as const;
export type L1Network = Chain;

export type ZkSyncNetwork = {
  id: number;
  key: string;
  name: string;
  rpcUrl: string;
  hidden?: boolean; // If set to true, the network will not be shown in the network selector
  deprecated?: boolean;
  l1Network?: L1Network;
  isPrividium?: boolean; // If true, the network uses Prividium for authentication
  blockExplorerUrl?: string;
  blockExplorerApi?: string;
  displaySettings?: {
    onramp?: boolean;
    showPartnerLinks?: boolean;
    isTestnet?: boolean;
  };
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  nativeTokenBridgingOnly?: boolean;
  getTokens?: () => Token[] | Promise<Token[]>; // If blockExplorerApi is specified, tokens will be fetched from there. Otherwise, this function will be used.
};

// See the official documentation on running a local ZKsync node: https://era.zksync.io/docs/tools/testing/
// Also see the guide in the README.md file in the root of the repository.

// In-memory node default config. Docs: https://era.zksync.io/docs/tools/testing/era-test-node.html
export const inMemoryNode: ZkSyncNetwork = {
  id: 260,
  key: "in-memory-node",
  name: "In-memory node",
  rpcUrl: "http://localhost:8011",
};

// Dockerized local setup default config. Docs: https://era.zksync.io/docs/tools/testing/dockerized-testing.html
export const dockerizedNode: ZkSyncNetwork = {
  id: 270,
  key: "dockerized-node",
  name: "Dockerized local node",
  rpcUrl: "http://localhost:3050",
  l1Network: {
    id: 9,
    name: "Ethereum Local Node",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["http://localhost:8545"] },
      public: { http: ["http://localhost:8545"] },
    },
  },
};

const publicChains: ZkSyncNetwork[] = [
  {
    id: 8022833,
    key: "testnet",
    name: "ZKsyncOS Testnet",
    rpcUrl: "https://zksync-os-testnet-alpha.zksync.dev",
    blockExplorerUrl: "https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev",
    blockExplorerApi: "https://block-explorer-api.zksync-os-testnet-alpha.zksync.dev",
    l1Network: l1Networks.sepolia,
    hidden: false,
    displaySettings: {
      isTestnet: true,
    },
  },
  {
    id: 270,
    key: "prividium-local",
    name: "ZKsyncOS Local Prividium",
    rpcUrl: "https://localhost:5050",
    l1Network: {
      id: 31337,
      name: "Local L1",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["http://localhost:5010"] },
      },
    },
    isPrividium: true,
    hidden: true,
    displaySettings: {
      isTestnet: true,
    },
  },
];

const getHyperchains = (): ZkSyncNetwork[] => {
  const hyperchains = portalRuntimeConfig.hyperchainsConfig || (Hyperchains as Config);
  return hyperchains.map((e) => {
    const network: ZkSyncNetwork = {
      ...e.network,
      getTokens: () => e.tokens,
    };
    if (e.network.publicL1NetworkId) {
      network.l1Network = Object.entries(l1Networks).find(([, chain]) => chain.id === e.network.publicL1NetworkId)?.[1];
      if (!network.l1Network) {
        throw new Error(
          `L1 network with ID ${e.network.publicL1NetworkId} from ${network.name} config wasn't found in the list of public L1 networks.`
        );
      }
    }
    return network;
  });
};

const nodeType = portalRuntimeConfig.nodeType;
const determineChainList = (): ZkSyncNetwork[] => {
  switch (nodeType) {
    case "memory":
      return [inMemoryNode];
    case "dockerized":
      return [dockerizedNode];
    case "hyperchain":
      return getHyperchains();
    default:
      return [...publicChains];
  }
};
export const isCustomNode = !!nodeType;
export const chainList: ZkSyncNetwork[] = determineChainList();
export const defaultNetwork = chainList[0];
