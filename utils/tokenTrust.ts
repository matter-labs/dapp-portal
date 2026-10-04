import { customBridgeTokens } from "@/data/customBridgeTokens";
import { L2_BASE_TOKEN_ADDRESS } from "@/utils/constants";

import type { Token } from "@/types";
import type { Provider } from "zksync-ethers";

export type TokenL1LinkCheckContext = {
  chainId: number;
  l1ChainId?: number;
  ethTokenAddress?: string;
};
type TokenL1LinkProvider = Pick<Provider, "getDefaultBridgeAddresses" | "l2TokenAddress" | "getCode">;

const isSameAddress = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

// L2-native tokens, the base token, ETH and custom bridge tokens from the config are trusted without an RPC check
export const isTokenL1LinkTrusted = (token: Token, context: TokenL1LinkCheckContext) =>
  !token.l1Address ||
  isSameAddress(token.address, L2_BASE_TOKEN_ADDRESS) ||
  isSameAddress(token.address, context.ethTokenAddress) ||
  customBridgeTokens.some(
    (customToken) =>
      customToken.chainId === context.l1ChainId &&
      isSameAddress(customToken.l1Address, token.l1Address) &&
      isSameAddress(customToken.l2Address, token.address)
  );

// A token whose check failed is shown as it is and checked again on a call made after this delay
export const FAILED_L1_LINK_CHECK_RETRY_DELAY = 60_000;

// Key of a token's check in the cache passed to findTokensWithUnverifiedL1Link
export const l1LinkCheckKey = (token: Token, chainId: number) =>
  `${chainId}:${token.address}:${token.l1Address}`.toLowerCase();

/**
 * Returns the lowercased addresses of tokens whose L1 address belongs to another token on this chain:
 * the bridged token of that L1 address exists and has a different address.
 * A check in progress is shared by overlapping calls. Tokens that could not be checked are not returned.
 */
export const findTokensWithUnverifiedL1Link = async (
  provider: TokenL1LinkProvider,
  tokens: Token[],
  context: TokenL1LinkCheckContext,
  cache: Map<string, Promise<boolean>>
): Promise<string[]> => {
  const cacheKey = (token: Token) => l1LinkCheckKey(token, context.chainId);
  const unchecked = new Map(
    tokens
      .filter((token) => !isTokenL1LinkTrusted(token, context))
      .map((token) => [cacheKey(token), token] as const)
      .filter(([key]) => !cache.has(key))
  );

  if (unchecked.size) {
    // Loaded once before the checks start. The provider caches the bridge addresses, so the l2TokenAddress calls
    // below reuse them instead of each loading them again
    const bridgeAddresses = provider.getDefaultBridgeAddresses();
    unchecked.forEach((token, key) => {
      const check = bridgeAddresses.then(async () => {
        const canonicalAddress = await provider.l2TokenAddress(token.l1Address!);
        return (
          !isSameAddress(canonicalAddress, token.address) &&
          (isSameAddress(canonicalAddress, L2_BASE_TOKEN_ADDRESS) ||
            (await provider.getCode(canonicalAddress)) !== "0x")
        );
      });
      cache.set(key, check);
      check.catch(() => setTimeout(() => cache.delete(key), FAILED_L1_LINK_CHECK_RETRY_DELAY));
    });
  }

  const results = await Promise.all(tokens.map((token) => cache.get(cacheKey(token))?.catch(() => false)));
  return [...new Set(tokens.filter((_, index) => results[index]).map((token) => token.address.toLowerCase()))];
};

// Tokens whose L1 address is claimed by more than one token on the list. At most one of them is the bridged token
export const findTokensWithSharedL1Address = (tokens: Token[]) => {
  const tokensPerL1Address = new Map<string, number>();
  tokens.forEach((token) => {
    const l1Address = token.l1Address?.toLowerCase();
    if (l1Address) tokensPerL1Address.set(l1Address, (tokensPerL1Address.get(l1Address) ?? 0) + 1);
  });
  return tokens.filter((token) => (tokensPerL1Address.get(token.l1Address?.toLowerCase() ?? "") ?? 0) > 1);
};

// Price and icon are removed, the fields used to build transactions are kept
export const sanitizeUnverifiedToken = <T extends Token>(token: T): T => ({
  ...token,
  price: undefined,
  iconUrl: undefined,
  isUnverified: true,
});
