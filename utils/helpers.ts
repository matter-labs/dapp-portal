import { utils } from "zksync-ethers";

import { customBridgeTokens } from "@/data/customBridgeTokens";

import type { ZkSyncNetwork } from "@/data/networks";
import type { Token, TokenAmount } from "@/types";

export function isOnlyZeroes(value: string) {
  return value.replace(/0/g, "").replace(/\./g, "").length === 0;
}

export function calculateFee(gasLimit: bigint, gasPrice: bigint) {
  return gasLimit * gasPrice;
}

export const getNetworkUrl = (network: ZkSyncNetwork, routePath: string) => {
  const url = new URL(routePath, window.location.origin);
  url.searchParams.set("network", network.key);
  return url.toString();
};

export const isMobile = () => {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
};

export const calculateTotalTokensPrice = (tokens: TokenAmount[]) => {
  return tokens.reduce((acc, { amount, decimals, price }) => {
    if (typeof price !== "number") return acc;
    return acc + parseFloat(parseTokenAmount(amount, decimals)) * price;
  }, 0);
};

// Changes URL without changing actual router view
export const silentRouterChange = (location: string, mode: "push" | "replace" = "push") => {
  window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", location);
};

interface RetryOptions {
  retries?: number;
  delay?: number;
}
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 2,
  delay: 0,
};
export async function retry<T>(func: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries, delay } = Object.assign({}, DEFAULT_RETRY_OPTIONS, options);
  try {
    return await func();
  } catch (error) {
    if (retries && retries > 0) {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return retry(func, { retries: retries - 1, delay });
    } else {
      throw error;
    }
  }
}

export enum AddressChainType {
  L1 = "L1",
  L2 = "L2",
}

export function getBalancesWithCustomBridgeTokens(
  balances: TokenAmount[] | undefined,
  addressChainType: AddressChainType,
  l1ChainId?: number
): TokenAmount[] {
  if (!balances || balances.length === 0) return [];

  const networkCustomBridgeTokens = customBridgeTokens.filter((customToken) => customToken.chainId === l1ChainId);

  const customBridgeTokensAddresses = networkCustomBridgeTokens.map((customToken) => {
    if (addressChainType === AddressChainType.L1) {
      return customToken.l1Address;
    }
    return customToken.l2Address;
  });

  const mappedCustomBridgeTokens: TokenAmount[] = networkCustomBridgeTokens.map((customToken) => {
    const customTokenAddress = addressChainType === AddressChainType.L1 ? customToken.l1Address : customToken.l2Address;
    const customTokenBalance = balances.find((balance) => balance.address === customTokenAddress);
    return {
      address: customTokenAddress,
      decimals: customTokenBalance?.decimals || customToken.decimals,
      name: customToken.name,
      symbol: customToken.symbol,
      amount: customTokenBalance?.amount || "0",
      l1Address: customToken.l1Address,
      l2Address: customToken.l2Address,
      iconUrl: customTokenBalance?.iconUrl,
      price: customTokenBalance?.price,
      isETH: customTokenBalance?.isETH || false,
      l1BridgeAddress: customToken.l1BridgeAddress,
      l2BridgeAddress: customToken.l2BridgeAddress,
    };
  });

  // Remove duplicate
  const filteredBalances = balances.filter((balance) => !customBridgeTokensAddresses.includes(balance.address));

  const sortedBalances = [...filteredBalances, ...mappedCustomBridgeTokens].sort((a, b) => {
    const ethAddress =
      addressChainType === AddressChainType.L1
        ? utils.ETH_ADDRESS.toUpperCase()
        : utils.L2_BASE_TOKEN_ADDRESS.toUpperCase();
    if (a.address.toUpperCase() === ethAddress) return -1; // Always bring ETH to the beginning
    if (b.address.toUpperCase() === ethAddress) return 1; // Keep ETH at the beginning if comparing with any other token

    const aPrice = a.price ? Number(a.price) : 0;
    const aAmount = a.amount ? Number(a.amount) : 0;
    const bPrice = b.price ? Number(b.price) : 0;
    const bAmount = b.amount ? Number(b.amount) : 0;
    const aValue = aPrice * aAmount;
    const bValue = bPrice * bAmount;

    return bValue - aValue;
  });

  return sortedBalances;
}

export function getTokensWithCustomBridgeTokens(
  tokens: Token[] | undefined,
  addressChainType: AddressChainType,
  l1ChainId?: number
): Token[] {
  if (!tokens || tokens.length === 0) return [];

  const networkCustomBridgeTokens = customBridgeTokens.filter((customToken) => customToken.chainId === l1ChainId);

  const customBridgeTokensAddresses = networkCustomBridgeTokens.map((customToken) => {
    if (addressChainType === AddressChainType.L1) {
      return customToken.l1Address;
    }
    return customToken.l2Address;
  });

  const mappedCustomBridgeTokens: Token[] = networkCustomBridgeTokens.map((customBridgeToken) => {
    const customBridgeTokenAddress =
      addressChainType === AddressChainType.L1 ? customBridgeToken.l1Address : customBridgeToken.l2Address;
    const customToken = tokens.find((token) => token.address === customBridgeTokenAddress);
    return {
      address: customBridgeTokenAddress,
      name: customBridgeToken.name,
      symbol: customBridgeToken.symbol,
      l1Address: customBridgeToken.l1Address,
      l2Address: customBridgeToken.l2Address,
      decimals: customToken?.decimals || customBridgeToken.decimals,
      iconUrl: customToken?.iconUrl,
      price: customToken?.price,
      isETH: customToken?.isETH || false,
      l1BridgeAddress: customBridgeToken.l1BridgeAddress,
      l2BridgeAddress: customBridgeToken.l2BridgeAddress,
    };
  });

  // Remove duplicate
  const filteredTokens = tokens.filter((token) => !customBridgeTokensAddresses.includes(token.address));

  const sortedTokens = [...mappedCustomBridgeTokens, ...filteredTokens].sort((a, b) => {
    const ethAddress =
      addressChainType === AddressChainType.L1
        ? utils.ETH_ADDRESS.toUpperCase()
        : utils.L2_BASE_TOKEN_ADDRESS.toUpperCase();
    if (a.address.toUpperCase() === ethAddress) return -1; // Always bring ETH to the beginning
    if (b.address.toUpperCase() === ethAddress) return 1; // Keep ETH at the beginning if comparing with any other token

    return 0;
  });

  return sortedTokens;
}

// @zksyncos
// Helpers for identifying withdrawal (L2-L1) transaction status

export function selectL2ToL1LogIndex(logs: any[]): number | null {
  if (!Array.isArray(logs) || logs.length === 0) return null;
  const i = logs.findIndex((l) => l?.is_service === true);
  return i >= 0 ? i : 0;
}

function extractRevertData(err: any): `0x${string}` | null {
  const hex = err?.data ?? err?.cause?.data ?? err?.cause?.cause?.data ?? err?.details;
  if (typeof hex === "string" && hex.startsWith("0x")) return hex as `0x${string}`;
  const meta: string[] | undefined = err?.metaMessages;
  if (Array.isArray(meta)) {
    const line = meta.find((l) => l.includes("0x"));
    const m = line?.match(/0x[0-9a-fA-F]+/);
    if (m) return m[0] as `0x${string}`;
  }
  return null;
}

// 0xa969e486 === LocalRootIsZero()
const LOCAL_ROOT_IS_ZERO_SELECTOR = "0xa969e486" as const;

export const isLocalRootIsZero = (err: any) =>
  extractRevertData(err)?.slice(0, 10).toLowerCase() === LOCAL_ROOT_IS_ZERO_SELECTOR;
