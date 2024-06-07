import { mainnet, sepolia } from "viem/chains";

import type { ZkSyncNetwork } from "../../data/networks";
import type { Token } from "../../types";

export type Network = Omit<ZkSyncNetwork & { publicL1NetworkId?: number }, "getTokens">;
export type Config = { network: Network; tokens: Token[] }[];

export const PUBLIC_L1_CHAINS = [mainnet, sepolia];
