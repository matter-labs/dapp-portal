import { utils } from "zksync-ethers";

import type { Address } from "viem";

export const L2_BASE_TOKEN_ADDRESS = utils.ETH_ADDRESS_IN_CONTRACTS as Address;
export const L2_NATIVE_TOKEN_VAULT_ADDRESS = utils.L2_NATIVE_TOKEN_VAULT_ADDRESS as Address;
export const L2_ASSET_ROUTER_ADDRESS = utils.L2_ASSET_ROUTER_ADDRESS as Address;
