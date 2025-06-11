export type CustomBridgeToken = {
  chainId: number;
  l1Address: string;
  l2Address: string;
  symbol: string;
  bridgedSymbol: string;
  decimals: number;
  name?: string;
  bridgingDisabled?: true;
  hideAlertMessage?: true;
  learnMoreUrl?: string;
  l1BridgeAddress?: string;
  l2BridgeAddress?: string;
  bridges: {
    label: string;
    iconUrl: string;
    depositUrl?: string;
    withdrawUrl?: string;
  }[];
};

export const customBridgeTokens: CustomBridgeToken[] = [
  {
    chainId: 1,
    l1Address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    l2Address: "0x703b52F2b28fEbcB60E1372858AF5b18849FE867",
    bridges: [],
    symbol: "wstETH",
    bridgedSymbol: "wstETH  (native)",
    name: "Wrapped liquid staked Ether 2.0 - Native Lido Bridge",
    l1BridgeAddress: "0x41527B2d03844dB6b0945f25702cB958b6d55989",
    l2BridgeAddress: "0xE1D6A50E7101c8f8db77352897Ee3f1AC53f782B",
    hideAlertMessage: true,
    decimals: 18,
  },
  {
    chainId: 1,
    l1Address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    l2Address: "0xCafB42a2654C20cb3739F04243E925aa47302bec",
    bridges: [],
    symbol: "wstETH",
    bridgedSymbol: "wstETH (ERC20)",
    name: "Wrapped liquid staked Ether 2.0 - Bridged ERC20",
    decimals: 18,
  },
  {
    chainId: 1,
    l1Address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    l2Address: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    learnMoreUrl: "https://www.circle.com/blog/native-usdc-now-available-on-zksync",
    bridges: [],
    symbol: "USDC",
    bridgedSymbol: "USDC.e",
    name: "USD Coin",
    decimals: 6,
  },
];
