import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref, watch } from "vue";
import { utils } from "zksync-ethers";

import usePromise from "@/composables/usePromise";
import { formatError, parseTokenAmount } from "@/utils/formatters";
import { calculateTotalTokensPrice } from "@/utils/helpers";
import { mapApiToken } from "@/utils/mappers";
import {
  FAILED_L1_LINK_CHECK_RETRY_DELAY,
  findTokensWithSharedL1Address,
  findTokensWithUnverifiedL1Link,
  type TokenL1LinkCheckContext,
} from "@/utils/tokenTrust";

import type { Api, Token } from "@/types";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("ofetch", () => ({ $fetch: fetchMock }));
vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException: () => undefined }) }));

const L2_BASE_TOKEN_ADDRESS = "0x000000000000000000000000000000000000800A";
const USER = "0x1111111111111111111111111111111111111111";
const OTHER_USER = "0x2222222222222222222222222222222222222222";
const USDC_L1 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
// Canonical bridged USDC on ZKsync Era, also listed in the custom bridge tokens config
const USDC_E = "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4";
// Unlisted token with the USDC symbol whose explorer record has the L1 address of USDC
const UNLISTED_USDC = "0x000000000000000000000000000000000000c0De";
const DAI_L1 = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const DAI_L2 = "0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656";
// ZK is L2-native, the explorer links it to L1 ZK whose canonical bridged address has no code
const ZK_L1 = "0x66A5cFB2e9c529f14FE6364Ad1075dF3a649C0A5";
const ZK_L2 = "0x5A7d6b2F92C77FAD6CCaBd7EE0624E64907Eaf3E";
const ZK_CANONICAL = "0xB5FBa66371bddBdac881673aa76Fb6A2aB2b0018";
const WSTETH_L1 = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
const WSTETH_NATIVE_L2 = "0x703b52F2b28fEbcB60E1372858AF5b18849FE867";
const NATIVE_USDC = "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4";
const USDC_ICON = "https://assets.coingecko.com/coins/images/6319/large/usdc.png";

const canonicalL2Addresses: Record<string, string> = {
  [utils.ETH_ADDRESS]: L2_BASE_TOKEN_ADDRESS,
  [USDC_L1.toLowerCase()]: USDC_E,
  [DAI_L1.toLowerCase()]: DAI_L2,
  [ZK_L1.toLowerCase()]: ZK_CANONICAL,
};
const deployedContracts = new Set([USDC_E, DAI_L2, ZK_L2].map((address) => address.toLowerCase()));

const createProvider = () => ({
  getDefaultBridgeAddresses: vi.fn(() => Promise.resolve({ sharedL2: "0x0000000000000000000000000000000000010003" })),
  l2TokenAddress: vi.fn((l1Address: string) => {
    const l2Address = canonicalL2Addresses[l1Address.toLowerCase()];
    return l2Address ? Promise.resolve(l2Address) : Promise.reject(new Error("execution reverted"));
  }),
  getCode: vi.fn((address: string) => Promise.resolve(deployedContracts.has(address.toLowerCase()) ? "0x6080" : "0x")),
});
type MockProvider = ReturnType<typeof createProvider>;

const token = (address: string, l1Address: string | undefined, symbol: string, extra: Partial<Token> = {}): Token => ({
  address,
  l1Address,
  symbol,
  name: symbol,
  decimals: 18,
  iconUrl: `https://icons.test/${symbol}.png`,
  price: 1,
  ...extra,
});
const unlistedUsdc = token(UNLISTED_USDC, USDC_L1, "USDC", { decimals: 6, iconUrl: USDC_ICON, price: 1.002 });
const usdcE = token(USDC_E, USDC_L1, "USDC", { decimals: 6, iconUrl: USDC_ICON });
const dai = token(DAI_L2, DAI_L1, "DAI");
const zk = token(ZK_L2, ZK_L1, "ZK", { price: 0.1 });
const eth = token(L2_BASE_TOKEN_ADDRESS, utils.ETH_ADDRESS, "ETH", { price: 2500 });
const mainnetContext: TokenL1LinkCheckContext = { chainId: 324, l1ChainId: 1, ethTokenAddress: L2_BASE_TOKEN_ADDRESS };

afterEach(() => {
  vi.useRealTimers();
});

describe("findTokensWithUnverifiedL1Link", () => {
  let provider: MockProvider;
  let cache: Map<string, Promise<boolean>>;
  const find = (tokens: Token[], context = mainnetContext) =>
    findTokensWithUnverifiedL1Link(
      provider as unknown as Parameters<typeof findTokensWithUnverifiedL1Link>[0],
      tokens,
      context,
      cache
    );

  beforeEach(() => {
    provider = createProvider();
    cache = new Map();
  });

  it("flags a token whose L1 address belongs to another bridged token", async () => {
    expect(await find([eth, usdcE, dai, unlistedUsdc])).toStrictEqual([UNLISTED_USDC.toLowerCase()]);
    expect(provider.l2TokenAddress.mock.calls).toStrictEqual([[DAI_L1], [USDC_L1]]);
    expect(provider.getCode.mock.calls).toStrictEqual([[USDC_E]]);
  });

  it("does not flag a canonical bridged token", async () => {
    expect(await find([dai, { ...dai, address: DAI_L2.toLowerCase(), l1Address: DAI_L1.toLowerCase() }])).toEqual([]);
    expect(provider.getCode).not.toHaveBeenCalled();
  });

  it("does not flag an L2-native token when no bridged token exists for its L1 address", async () => {
    expect(await find([zk])).toEqual([]);
    expect(provider.getCode.mock.calls).toStrictEqual([[ZK_CANONICAL]]);
  });

  it("flags a token that claims the L1 address of the base token", async () => {
    const otherEth = token("0x000000000000000000000000000000000000E7e1", utils.ETH_ADDRESS, "ETH", { price: 2500 });

    expect(await find([otherEth])).toStrictEqual([otherEth.address.toLowerCase()]);
    expect(provider.getCode).not.toHaveBeenCalled();
  });

  it("makes no RPC calls for trusted tokens", async () => {
    const tokens = [
      eth,
      usdcE,
      token(WSTETH_NATIVE_L2, WSTETH_L1, "wstETH"),
      token(NATIVE_USDC, undefined, "USDC"),
      token("0x0000000000000000000000000000000000000E7e", utils.ETH_ADDRESS, "ETH"),
    ];

    expect(
      await find(tokens, { ...mainnetContext, ethTokenAddress: "0x0000000000000000000000000000000000000E7e" })
    ).toEqual([]);
    expect(provider.getDefaultBridgeAddresses).not.toHaveBeenCalled();
    expect(provider.l2TokenAddress).not.toHaveBeenCalled();
  });

  it("flags a token without a price or an icon", async () => {
    const plainUsdc = { ...unlistedUsdc, price: undefined, iconUrl: undefined };

    expect(await find([plainUsdc])).toStrictEqual([UNLISTED_USDC.toLowerCase()]);
  });

  it("does not flag a token when its check fails and checks it again after a delay", async () => {
    vi.useFakeTimers();
    provider.l2TokenAddress.mockRejectedValueOnce(new Error("network error"));

    expect(await find([unlistedUsdc])).toEqual([]);
    expect(await find([unlistedUsdc])).toEqual([]);
    expect(provider.l2TokenAddress).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(FAILED_L1_LINK_CHECK_RETRY_DELAY);

    expect(await find([unlistedUsdc])).toStrictEqual([UNLISTED_USDC.toLowerCase()]);
    expect(provider.l2TokenAddress).toHaveBeenCalledTimes(2);
  });
});

describe("findTokensWithSharedL1Address", () => {
  it("returns the tokens that claim the same L1 address", () => {
    const otherCaseUsdc = { ...unlistedUsdc, l1Address: USDC_L1.toLowerCase() };

    expect(findTokensWithSharedL1Address([eth, usdcE, dai, zk, otherCaseUsdc])).toStrictEqual([usdcE, otherCaseUsdc]);
    expect(findTokensWithSharedL1Address([eth, usdcE, dai, token(NATIVE_USDC, undefined, "USDC")])).toEqual([]);
  });
});

/* Store wiring: explorer balances of the connected account and the tokens list */
vi.stubGlobal("defineStore", (_id: string, setup: () => unknown) => setup);
vi.stubGlobal("storeToRefs", (store: object) => store);
vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("watch", watch);
vi.stubGlobal("usePromise", usePromise);
vi.stubGlobal("formatError", formatError);
vi.stubGlobal("mapApiToken", mapApiToken);
vi.stubGlobal("parseTokenAmount", parseTokenAmount);
vi.stubGlobal("L2_BASE_TOKEN_ADDRESS", L2_BASE_TOKEN_ADDRESS);
vi.stubGlobal("useScreening", () => ({ validateAddress: () => Promise.resolve() }));
const account = ref({ address: USER });
let onAccountChange: () => void = () => undefined;
vi.stubGlobal("useOnboardStore", () => ({
  account,
  subscribeOnAccountChange: (callback: () => void) => {
    onAccountChange = callback;
    return () => undefined;
  },
}));

let storeProvider = createProvider();
vi.stubGlobal("useZkSyncProviderStore", () => ({
  eraNetwork: computed(() => ({
    id: 324,
    key: "era-mainnet",
    name: "ZKsync Era",
    l1Network: { id: 1 },
    blockExplorerApi: "https://explorer.test",
    getTokens: () => [],
  })),
  requestProvider: () => Promise.resolve(storeProvider),
}));

const apiToken = (tokenData: Token): Api.Response.Token => ({
  l2Address: tokenData.address,
  l1Address: tokenData.l1Address ?? null,
  symbol: tokenData.symbol,
  name: tokenData.name ?? null,
  decimals: tokenData.decimals,
  usdPrice: tokenData.price ?? null,
  liquidity: 1000,
  iconURL: tokenData.iconUrl ?? null,
});
const explorerTokens = ref<Token[]>([]);
// Balances of the connected account
const heldBalances = ref<{ token: Token; balance: string }[]>([]);
fetchMock.mockImplementation((url: string) => {
  if (url.includes("/tokens?") && url.endsWith("page=1")) {
    return Promise.resolve({ items: explorerTokens.value.map(apiToken) });
  }
  if (url.includes("/tokens?")) return Promise.resolve({ items: [] });
  if (url.endsWith(`/address/${account.value.address}`)) {
    return Promise.resolve({
      balances: Object.fromEntries(
        heldBalances.value.map(({ token: tokenData, balance }) => [
          tokenData.address,
          { balance, token: apiToken(tokenData) },
        ])
      ),
    });
  }
  return Promise.reject(new Error(`Unexpected request ${url}`));
});

// With the stubs above a store is the object returned by its setup function
const createStores = async () => {
  const { useZkSyncTokensStore } = await import("@/store/zksync/tokens");
  const tokensStore = useZkSyncTokensStore();
  vi.stubGlobal("useZkSyncTokensStore", () => tokensStore);
  const { useZkSyncWalletStore } = await import("@/store/zksync/wallet");
  const walletStore = useZkSyncWalletStore();
  return {
    ...storeToRefs(tokensStore),
    ...storeToRefs(walletStore),
    requestTokens: tokensStore.requestTokens,
    requestBalance: walletStore.requestBalance,
  };
};
const byAddress = (balances: Token[], address: string) => balances.find((e) => e.address === address);

describe("Held tokens with an unverified L1 address", () => {
  const ETH_AMOUNT = "1000000000000000000";
  const UNLISTED_AMOUNT = "5000000";
  // 1 ETH, 2 DAI and 10 ZK
  const LISTED_TOTAL = 2500 + 2 + 1;

  beforeEach(() => {
    storeProvider = createProvider();
    account.value = { address: USER };
    explorerTokens.value = [eth, usdcE, dai, zk, unlistedUsdc];
    heldBalances.value = [
      { token: eth, balance: ETH_AMOUNT },
      { token: dai, balance: "2000000000000000000" },
      { token: zk, balance: "10000000000000000000" },
      { token: unlistedUsdc, balance: UNLISTED_AMOUNT },
    ];
  });

  const loadBalances = async () => {
    const stores = await createStores();
    await stores.requestBalance();
    // Lets the check started in the background finish
    await new Promise((resolve) => setTimeout(resolve));
    return stores;
  };

  it("drops the price and icon of a token with another token's L1 address and excludes it from the total", async () => {
    const { balance, tokens } = await loadBalances();

    expect(byAddress(balance.value, UNLISTED_USDC)).toStrictEqual({
      ...unlistedUsdc,
      l1BridgeAddress: undefined,
      l2BridgeAddress: undefined,
      isETH: false,
      price: undefined,
      iconUrl: undefined,
      isUnverified: true,
      amount: UNLISTED_AMOUNT,
    });
    // Send looks the token up in the tokens list first
    expect(tokens.value![UNLISTED_USDC]).toMatchObject({ price: undefined, iconUrl: undefined, isUnverified: true });
    expect(calculateTotalTokensPrice(balance.value)).toBe(LISTED_TOTAL);
  });

  it("keeps legitimate tokens unchanged", async () => {
    const { balance, tokens } = await loadBalances();

    expect(byAddress(balance.value, L2_BASE_TOKEN_ADDRESS)).toStrictEqual({
      ...eth,
      l1BridgeAddress: undefined,
      l2BridgeAddress: undefined,
      isETH: true,
      iconUrl: "/img/eth.svg",
      amount: ETH_AMOUNT,
    });
    for (const listedToken of [dai, zk]) {
      expect(byAddress(balance.value, listedToken.address)).toStrictEqual({
        ...listedToken,
        l1BridgeAddress: undefined,
        l2BridgeAddress: undefined,
        isETH: false,
        amount: heldBalances.value.find((e) => e.token.address === listedToken.address)!.balance,
      });
      expect(tokens.value![listedToken.address]).not.toHaveProperty("isUnverified");
    }
    expect(balance.value.filter((e) => e.isUnverified).map((e) => e.address)).toStrictEqual([UNLISTED_USDC]);
    // ETH is trusted without a check. USDC is checked when the list is loaded, since two listed tokens claim it,
    // and the other held tokens are checked once with the balances
    expect(storeProvider.l2TokenAddress.mock.calls).toStrictEqual([[utils.ETH_ADDRESS], [USDC_L1], [DAI_L1], [ZK_L1]]);
  });

  it("keeps the bridged token in l1Tokens when a token that is not held claims its L1 address", async () => {
    // Listed before DAI, so it would take DAI's place without the check of the list
    const cloneDai = token("0x000000000000000000000000000000000000DA1C", DAI_L1, "DAI", {
      decimals: 6,
      iconUrl: "https://icons.test/clone.png",
    });
    explorerTokens.value = [eth, cloneDai, dai];
    heldBalances.value = [{ token: eth, balance: ETH_AMOUNT }];

    const { l1Tokens, tokens, requestTokens } = await createStores();
    await requestTokens();
    await new Promise((resolve) => setTimeout(resolve));

    expect(l1Tokens.value![DAI_L1]).toMatchObject({ decimals: 18, iconUrl: dai.iconUrl, name: dai.name });
    expect(tokens.value![cloneDai.address]).toMatchObject({ price: undefined, iconUrl: undefined, isUnverified: true });
    expect(tokens.value![DAI_L2]).not.toHaveProperty("isUnverified");
  });

  it("checks the token list again after a delay when its check fails", async () => {
    vi.useFakeTimers();
    const cloneDai = token("0x000000000000000000000000000000000000DA1C", DAI_L1, "DAI", { decimals: 6 });
    explorerTokens.value = [eth, cloneDai, dai];
    // The first check of DAI's L1 address fails
    const l2TokenAddress = storeProvider.l2TokenAddress.getMockImplementation()!;
    let daiChecks = 0;
    storeProvider.l2TokenAddress.mockImplementation((l1Address: string) =>
      l1Address === DAI_L1 && daiChecks++ === 0 ? Promise.reject(new Error("network error")) : l2TokenAddress(l1Address)
    );

    const { l1Tokens, tokens, requestTokens } = await createStores();
    await requestTokens();
    await vi.advanceTimersByTimeAsync(0);
    // The check failed, so the first listed token is used meanwhile
    expect(l1Tokens.value![DAI_L1]).toMatchObject({ decimals: 6 });
    expect(tokens.value![cloneDai.address]).not.toHaveProperty("isUnverified");

    await vi.advanceTimersByTimeAsync(FAILED_L1_LINK_CHECK_RETRY_DELAY);

    expect(l1Tokens.value![DAI_L1]).toMatchObject({ decimals: 18, iconUrl: dai.iconUrl });
    expect(tokens.value![cloneDai.address]).toMatchObject({ isUnverified: true });
    // Both listed tokens with DAI's L1 address are checked, then only the failed check is repeated
    expect(storeProvider.l2TokenAddress.mock.calls.filter(([l1Address]) => l1Address === DAI_L1)).toHaveLength(3);
  });

  it("returns balances without waiting for a slow check and applies its result when it arrives", async () => {
    vi.useFakeTimers();
    let finishCheck!: () => void;
    const checkFinished = new Promise<void>((resolve) => (finishCheck = resolve));
    storeProvider.l2TokenAddress.mockImplementation((l1Address: string) => {
      const l2Address = canonicalL2Addresses[l1Address.toLowerCase()];
      return l1Address === USDC_L1 ? checkFinished.then(() => l2Address) : Promise.resolve(l2Address);
    });
    const { balance, tokens, l1Tokens, requestBalance } = await createStores();

    // A refresh made while the check is still running does not start another one
    for (const force of [false, true]) {
      let loaded = false;
      requestBalance({ force }).then(() => (loaded = true));
      await vi.advanceTimersByTimeAsync(0);
      expect(loaded).toBe(true);
    }
    expect(byAddress(balance.value, UNLISTED_USDC)).toMatchObject({ price: 1.002, iconUrl: USDC_ICON });
    // Until the check finishes, the first listed token with the L1 address is used, here USDC.e
    expect(l1Tokens.value![USDC_L1]).toMatchObject({ price: 1 });
    expect(storeProvider.l2TokenAddress.mock.calls.filter(([l1Address]) => l1Address === USDC_L1)).toHaveLength(1);

    // Another account holding 2 ETH is connected before the check finishes
    heldBalances.value = [{ token: eth, balance: "2000000000000000000" }];
    account.value = { address: OTHER_USER };
    onAccountChange();
    await requestBalance();
    finishCheck();
    await vi.advanceTimersByTimeAsync(0);

    expect(byAddress(balance.value, UNLISTED_USDC)).toMatchObject({
      amount: "0",
      price: undefined,
      isUnverified: true,
    });
    expect(tokens.value![UNLISTED_USDC]).toMatchObject({ price: undefined, isUnverified: true });
    expect(l1Tokens.value![USDC_L1]).toMatchObject({ price: 1, iconUrl: USDC_ICON });
    expect(calculateTotalTokensPrice(balance.value)).toBe(5000);
  });
});
