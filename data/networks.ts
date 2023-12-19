import { goerli, mainnet, sepolia } from "@wagmi/core/chains";

import type { Token } from "@/types";
import type { Chain } from "@wagmi/core/chains";

export const l1Networks = {
  mainnet: {
    ...mainnet,
    name: "Ethereum",
    network: "mainnet",
  },
  goerli: {
    ...goerli,
    name: "Ethereum Goerli Testnet",
  },
  sepolia: {
    ...sepolia,
    name: "Ethereum Sepolia Testnet",
    rpcUrls: {
      public: { http: ["https://rpc.ankr.com/eth_sepolia"] },
      default: { http: ["https://rpc.ankr.com/eth_sepolia"] },
    },
  },
} as const;
export type L1Network = Chain;

export type ZkSyncNetwork = {
  id: number;
  key: string;
  name: string;
  shortName: string;
  rpcUrl: string;
  hidden?: boolean; // If set to true, the network will not be shown in the network selector
  l1Network?: L1Network;
  blockExplorerUrl?: string;
  blockExplorerApi?: string;
  displaySettings?: {
    showPartnerLinks?: boolean;
    showZkSyncLiteNetworks?: boolean;
  };
  getTokens?: () => Token[] | Promise<Token[]>; // If blockExplorerApi is specified, tokens will be fetched from there. Otherwise, this function will be used.
};

// See the official documentation on running a local zkSync node: https://era.zksync.io/docs/tools/testing/
// Also see the guide in the README.md file in the root of the repository.

// In-memory node default config. Docs: https://era.zksync.io/docs/tools/testing/era-test-node.html
export const inMemoryNode: ZkSyncNetwork = {
  id: 260,
  key: "in-memory-node",
  name: "In-memory node",
  shortName: "In-memory local node",
  rpcUrl: "http://localhost:8011",
};

// Dockerized local setup default config. Docs: https://era.zksync.io/docs/tools/testing/dockerized-testing.html
export const dockerizedNode: ZkSyncNetwork = {
  id: 270,
  key: "dockerized-node",
  name: "Dockerized local node",
  shortName: "Dockerized node",
  rpcUrl: "http://localhost:3050",
  l1Network: {
    id: 9,
    name: "L1 Local",
    network: "l1-local",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["http://localhost:8545"] },
      public: { http: ["http://localhost:8545"] },
    },
  },
};

export const zkSyncNetworks: ZkSyncNetwork[] = [
  {
    id: 324,
    key: "mainnet",
    name: "zkSync",
    shortName: "zkSync",
    rpcUrl: "https://mainnet.era.zksync.io",
    blockExplorerUrl: "https://explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.mainnet.zksync.io",
    displaySettings: {
      showPartnerLinks: true,
      showZkSyncLiteNetworks: true,
    },
    l1Network: l1Networks.mainnet,
  },
  {
    id: 300,
    key: "sepolia",
    name: "zkSync Sepolia Testnet",
    shortName: "zkSync Sepolia",
    rpcUrl: "https://sepolia.era.zksync.dev",
    blockExplorerUrl: "https://sepolia.explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.sepolia.zksync.dev",
    displaySettings: {
      showPartnerLinks: true,
      showZkSyncLiteNetworks: true,
    },
    l1Network: l1Networks.sepolia,
  },
  {
    id: 280,
    key: "goerli",
    name: "zkSync Goerli Testnet",
    shortName: "zkSync Goerli",
    rpcUrl: "https://testnet.era.zksync.dev",
    blockExplorerUrl: "https://goerli.explorer.zksync.io",
    blockExplorerApi: "https://block-explorer-api.testnets.zksync.dev",
    displaySettings: {
      showPartnerLinks: true,
      showZkSyncLiteNetworks: true,
    },
    l1Network: l1Networks.goerli,
  },
  {
    id: 270,
    key: "stage",
    name: "zkSync Stage",
    shortName: "zkSync Stage",
    rpcUrl: "https://z2-dev-api.zksync.dev",
    blockExplorerUrl: "https://goerli-beta.staging-scan-v2.zksync.dev",
    blockExplorerApi: "https://block-explorer-api.stage.zksync.dev",
    l1Network: l1Networks.sepolia,
    hidden: true,
  },
];
