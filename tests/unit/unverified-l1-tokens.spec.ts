import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createSSRApp,
  defineComponent,
  h,
  ref,
  type Component,
  type FunctionalComponent,
  type Slots,
  type VNode,
} from "vue";
import { parse } from "vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";
import { utils } from "zksync-ethers";

import usePromise from "@/composables/usePromise";
import { checksumAddress, formatError, shortenAddress } from "@/utils/formatters";

import { toText as htmlToText } from "./helpers/render-template";

import type { Token, TokenAmount } from "@/types";

const { getAccountBalance, getBalance } = vi.hoisted(() => ({ getAccountBalance: vi.fn(), getBalance: vi.fn() }));

vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException: () => undefined }) }));
vi.mock("@ankr.com/ankr.js", () => ({
  AnkrProvider: class {
    getAccountBalance = getAccountBalance;
  },
}));
vi.mock("@wagmi/core", () => ({ getBalance }));
vi.mock("@/data/wagmi", () => ({ wagmiConfig: {} }));

const USER = "0x1111111111111111111111111111111111111111";
// Token that is on none of the token lists and declares itself as "USDC / USD Coin"
const UNLISTED_USDC = "0x5a3D1e2b4c6F7A8b9C0D1E2F3A4b5C6d7e8f9A0b";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WSTETH = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const UNI = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
const LINK = "0x514910771AF9Ca656af840dff83E8264EcF986CA";
const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";

const runtimeConfig: { ankrToken?: string } = {};
vi.stubGlobal("usePortalRuntimeConfig", () => runtimeConfig);
vi.stubGlobal("defineStore", (_id: string, setup: () => unknown) => setup);
vi.stubGlobal("storeToRefs", (store: object) => store);
vi.stubGlobal("ref", ref);
vi.stubGlobal("computed", computed);
vi.stubGlobal("usePromise", usePromise);
vi.stubGlobal("checksumAddress", checksumAddress);
vi.stubGlobal("formatError", formatError);
vi.stubGlobal("useOnboardStore", () => ({
  account: ref({ address: USER }),
  subscribeOnAccountChange: () => () => undefined,
}));

const { l1Networks } = await import("@/data/networks");

const l1Network = ref<{ id: number; name: string }>(l1Networks.mainnet);
const configTokens = ref<Token[]>([]);
const l1Tokens = ref<{ [tokenAddress: string]: Token }>({});
vi.stubGlobal("useZkSyncProviderStore", () => ({
  eraNetwork: computed(() => ({
    name: "ZKsync Test",
    l1Network: l1Network.value,
    getTokens: () => configTokens.value,
  })),
}));
vi.stubGlobal("useNetworkStore", () => ({ l1Network, selectedNetwork: ref({ name: "ZKsync Test" }) }));
vi.stubGlobal("useZkSyncTokensStore", () => ({ l1Tokens, requestTokens: () => Promise.resolve() }));

const { useEthereumBalanceStore } = await import("@/store/ethereumBalance");
vi.stubGlobal("useEthereumBalanceStore", useEthereumBalanceStore);
const { useZkSyncEthereumBalanceStore } = await import("@/store/zksync/ethereumBalance");

type AnkrAsset = {
  tokenType: "NATIVE" | "ERC20";
  contractAddress?: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  thumbnail: string;
  tokenPrice: string;
  balanceRawInteger: string;
};
const ankrAsset = (contractAddress: string, symbol: string, name: string, decimals = 18): AnkrAsset => ({
  tokenType: "ERC20",
  // Ankr returns lowercase contract addresses
  contractAddress: contractAddress.toLowerCase(),
  tokenSymbol: symbol,
  tokenName: name,
  tokenDecimals: decimals,
  thumbnail: `https://ankr.test/${symbol}.png`,
  tokenPrice: "1",
  balanceRawInteger: "1000000",
});
const ankrAssets: AnkrAsset[] = [
  { ...ankrAsset("", "ETH", "Ethereum"), tokenType: "NATIVE", contractAddress: undefined },
  ankrAsset(UNLISTED_USDC, "USDC", "USD Coin", 6),
  ankrAsset(USDC, "USDC", "USD Coin", 6),
  ankrAsset(WSTETH, "wstETH", "Wrapped liquid staked Ether 2.0"),
  ankrAsset(DAI, "DAI", "Dai Stablecoin"),
  ankrAsset(USDT, "USDT", "Tether USD", 6),
  ankrAsset(UNI, "UNI", "Uniswap"),
  ankrAsset(LINK, "LINK", "ChainLink Token"),
];

const l1Token = (address: string, symbol: string, decimals = 18): Token => ({
  address,
  symbol,
  name: `${symbol} from explorer`,
  decimals,
  iconUrl: `https://explorer.test/${symbol}.png`,
});
const explorerL1Tokens = () => ({
  [utils.ETH_ADDRESS]: { ...l1Token(utils.ETH_ADDRESS, "ETH"), isETH: true },
  [USDC]: l1Token(USDC, "USDC", 6),
  [WSTETH]: l1Token(WSTETH, "wstETH"),
  [DAI]: l1Token(DAI, "DAI"),
  // The explorer and hyperchain configs do not always checksum addresses
  [USDT.toLowerCase()]: l1Token(USDT.toLowerCase(), "USDT", 6),
  [WBTC]: l1Token(WBTC, "WBTC", 8),
});

const requestL1Balances = async () => (await useZkSyncEthereumBalanceStore().requestBalance())!;
const unverifiedAddresses = (balances: Token[]) =>
  balances.filter((token) => token.isUnverified).map((token) => token.address);
const findBalance = (balances: TokenAmount[], address: string) =>
  balances.filter((token) => token.address.toLowerCase() === address.toLowerCase());

describe("L1 balances on the Deposit page", () => {
  beforeEach(() => {
    runtimeConfig.ankrToken = "ankr-token";
    l1Network.value = l1Networks.mainnet;
    configTokens.value = [
      { address: "0x0000000000000000000000000000000000000001", l1Address: UNI, symbol: "UNI", decimals: 18 },
      {
        address: "0x0000000000000000000000000000000000000002",
        l1Address: LINK.toLowerCase(),
        symbol: "LINK",
        decimals: 18,
      },
    ];
    l1Tokens.value = explorerL1Tokens();
    getAccountBalance.mockReset().mockResolvedValue({ assets: ankrAssets });
    getBalance.mockReset().mockResolvedValue({ value: 5n });
  });

  it("flags a token that is not on the Portal's token lists", async () => {
    const balances = await requestL1Balances();

    expect(unverifiedAddresses(balances)).toStrictEqual([UNLISTED_USDC]);
    expect(findBalance(balances, UNLISTED_USDC)).toStrictEqual([
      {
        address: UNLISTED_USDC,
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        iconUrl: "https://ankr.test/USDC.png",
        price: 1,
        amount: "1000000",
        isUnverified: true,
      },
    ]);
  });

  it("does not flag ETH, explorer, config or custom bridge tokens", async () => {
    const balances = await requestL1Balances();

    const verified = balances.filter((token) => token.address !== UNLISTED_USDC);
    expect(verified.map((token) => token.address)).toEqual(
      expect.arrayContaining([utils.ETH_ADDRESS, USDC, WSTETH, DAI, USDT, UNI, LINK, WBTC])
    );
    verified.forEach((token) => expect(token).not.toHaveProperty("isUnverified"));
    // Explorer metadata is still used for known tokens
    expect(findBalance(balances, DAI)[0]).toMatchObject({ symbol: "DAI", iconUrl: "https://explorer.test/DAI.png" });
    // Custom bridge tokens are rebuilt from the config, one row per L2 counterpart
    expect(findBalance(balances, USDC)).toHaveLength(1);
    expect(findBalance(balances, WSTETH)).toHaveLength(2);
    // Known tokens without an L1 balance
    expect(findBalance(balances, WBTC)[0]).toMatchObject({ amount: "0" });
  });
});

// Renders the real template of a component with stubbed child components and bindings that mirror its script setup
const parseSfc = (file: string) =>
  parse(readFileSync(fileURLToPath(new URL(`../../${file}`, import.meta.url)), "utf8")).descriptor;
const loadTemplate = (file: string) => {
  const template = parseSfc(file).template?.content;
  if (!template) throw new Error(`${file} has no template`);
  // The runtime template compiler does not accept TypeScript non-null assertions
  return template.replace(/(\w)!(?=[.,)"\s])/g, "$1");
};
const stub = (render: (props: Record<string, any>, slots: Slots) => VNode | VNode[], props: string[] = []) => {
  const component: FunctionalComponent<Record<string, any>> = (componentProps, { slots }) =>
    render(componentProps, slots);
  component.props = props;
  component.inheritAttrs = false;
  return component;
};
const slotsStub = (tag: string) =>
  stub((_, slots) =>
    h(
      tag,
      Object.values(slots).flatMap((slot) => slot?.() ?? [])
    )
  );
// Texts of different elements stay apart, e.g. "USDC Unverified"
const toText = (html: string) => htmlToText(html, " ");
const render = async (
  file: string,
  props: Record<string, unknown>,
  bindings: Record<string, unknown>,
  stubs: Record<string, Component>
) => {
  const template = loadTemplate(file);
  const component = defineComponent({
    props: Object.keys(props),
    setup: () => bindings,
    template,
  });
  const app = createSSRApp(component, props);
  app.config.warnHandler = () => undefined;
  app.directive("tooltip", {
    getSSRProps: (binding) => ({ "data-tooltip": binding.value }),
  });
  Object.entries(stubs).forEach(([name, stubComponent]) => app.component(name, stubComponent));
  const html = await renderToString(app);
  return { html, text: toText(html) };
};

const unlistedUsdc: TokenAmount = {
  address: UNLISTED_USDC,
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  iconUrl: "https://icons.test/usdc.png",
  amount: "1000000",
  isUnverified: true,
};
const commonStubs = {
  TokenImage: stub((props) => h("img", { "data-icon": props.iconUrl }), ["iconUrl"]),
  ExclamationTriangleIcon: stub(() => h("svg")),
};

describe("TokenLine", () => {
  const lineStubs = {
    ...commonStubs,
    CommonButtonLineWithImg: slotsStub("div"),
    CommonButtonLineBodyInfo: stub((_, slots) =>
      h(
        "div",
        ["label", "underline"].map((name) => h("div", { "data-slot": name }, slots[name]?.()))
      )
    ),
  };
  const renderLine = (token: Token) =>
    render("components/token/TokenLine.vue", { isUnverified: false, ...token }, { shortenAddress }, lineStubs).then(
      ({ html }) => ({
        html,
        label: toText(html.match(/data-slot="label">([\s\S]*?)<\/div><div data-slot/)?.[1] ?? ""),
        underline: toText(html.match(/data-slot="underline">([\s\S]*)$/)?.[1] ?? ""),
      })
    );

  it("shows an unverified badge and the contract address", async () => {
    const result = await renderLine(unlistedUsdc);

    expect(result.label).toBe("USDC Unverified");
    expect(result.underline).toBe(`${shortenAddress(UNLISTED_USDC)} · USD Coin`);
    expect(result.html).toContain(`title="${UNLISTED_USDC}"`);
  });
});

describe("Confirmation screen token entry", () => {
  const renderEntry = (token: TokenAmount) =>
    render(
      "components/transaction/summary/TokenEntry.vue",
      { label: "You bridge", token },
      { displayedAmount: "1", formatTokenPrice: () => "$1.00" },
      { ...commonStubs, CommonButtonLine: slotsStub("div") }
    );

  it("shows the unverified badge and the full contract address", async () => {
    const { text } = await renderEntry(unlistedUsdc);

    expect(text).toBe(`You bridge 1 USDC Unverified token ${UNLISTED_USDC}`);
  });
});

describe("Deposit form", () => {
  const renderDeposit = (token: Token, l1BlockExplorerUrl: string) => {
    const destinations = {
      ethereum: { key: "ethereum", label: "Ethereum", iconUrl: "" },
      era: { key: "era", label: "ZKsync", iconUrl: "" },
    };
    return render(
      "views/transactions/Deposit.vue",
      {},
      {
        step: "form",
        destinations,
        destination: destinations.era,
        eraNetwork: { name: "ZKsync", displaySettings: {}, l1Network: { name: "Ethereum" } },
        account: { address: USER },
        shortenAddress,
        selectedToken: token,
        availableTokens: [token],
        availableBalances: [token],
        enoughAllowance: true,
        enoughBalanceToCoverFee: true,
        continueButtonDisabled: false,
        l1BlockExplorerUrl,
        TransitionOpacity: () => ({}),
        TransitionAlertScaleInOutTransition: {},
        ExclamationTriangleIcon: "svg",
      },
      {
        CommonHeightTransition: stub((props, slots) => h("div", props.opened ? slots.default?.() : []), ["opened"]),
        CommonAlert: slotsStub("div"),
        CommonButton: slotsStub("button"),
        CommonButtonDropdown: slotsStub("button"),
        CommonInputTransactionAmount: slotsStub("div"),
        CommonInputTransactionAddress: slotsStub("div"),
        EthereumTransactionFooter: slotsStub("div"),
      }
    );
  };
  const warning = (text: string) =>
    text.match(/This token is not on the Portal's token list[^]*?0x[0-9a-fA-F]{40}/)?.[0];

  it("warns about an unverified token and links its contract address", async () => {
    const { html, text } = await renderDeposit(unlistedUsdc, "https://etherscan.test");

    expect(warning(text)).toBe(
      "This token is not on the Portal's token list, so its name, symbol and icon are not verified and can imitate another token. Check the token contract address before bridging: " +
        UNLISTED_USDC
    );
    expect(html).toContain(`href="https://etherscan.test/address/${UNLISTED_USDC}"`);
    expect(text).toContain("Continue");
  });
});
