import { $fetch } from "ofetch";
import { utils } from "zksync-ethers";

import { customBridgeTokens } from "@/data/customBridgeTokens";

import type { Api, Token } from "@/types";

export const useZkSyncTokensStore = defineStore("zkSyncTokens", () => {
  const providerStore = useZkSyncProviderStore();
  const { eraNetwork } = storeToRefs(providerStore);

  const {
    result: tokensRaw,
    inProgress: tokensRequestInProgress,
    error: tokensRequestError,
    execute: requestTokens,
    reset: resetTokens,
  } = usePromise<Token[]>(async () => {
    const provider = providerStore.requestProvider();
    const ethL2TokenAddress = await provider.l2TokenAddress(utils.ETH_ADDRESS);

    let baseToken = null;
    let ethToken = null;
    let explorerTokens: Token[] = [];
    let configTokens: Token[] = [];

    if (eraNetwork.value.blockExplorerApi) {
      const responses: Api.Response.Collection<Api.Response.Token>[] = await Promise.all([
        $fetch(`${eraNetwork.value.blockExplorerApi}/tokens?minLiquidity=0&limit=100&page=1`),
        $fetch(`${eraNetwork.value.blockExplorerApi}/tokens?minLiquidity=0&limit=100&page=2`),
        $fetch(`${eraNetwork.value.blockExplorerApi}/tokens?minLiquidity=0&limit=100&page=3`),
      ]);
      explorerTokens = responses.map((response) => response.items.map(mapApiToken)).flat();
      baseToken = explorerTokens.find((token) => token.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase());
      ethToken = explorerTokens.find((token) => token.address.toUpperCase() === ethL2TokenAddress.toUpperCase());
    }

    if (eraNetwork.value.getTokens && (!baseToken || !ethToken)) {
      configTokens = await eraNetwork.value.getTokens();
      if (!baseToken) {
        baseToken = configTokens.find((token) => token.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase());
      }
      if (!ethToken) {
        ethToken = configTokens.find((token) => token.address.toUpperCase() === ethL2TokenAddress.toUpperCase());
      }
    }

    if (!baseToken) {
      baseToken = {
        address: "0x000000000000000000000000000000000000800A",
        l1Address: await provider.getBaseTokenContractAddress(),
        symbol: "BASETOKEN",
        name: "Base Token",
        decimals: 18,
        iconUrl: "/img/eth.svg",
      };
    }
    if (!ethToken) {
      ethToken = {
        address: ethL2TokenAddress,
        l1Address: utils.ETH_ADDRESS,
        symbol: "ETH",
        name: "Ether",
        decimals: 18,
        iconUrl: "/img/eth.svg",
      };
    }

    const tokens = explorerTokens.length ? explorerTokens : configTokens;
    const nonBaseOrEthExplorerTokens = tokens.filter(
      (token) => token.address !== L2_BASE_TOKEN_ADDRESS && token.address !== ethL2TokenAddress
    );
    return [
      baseToken,
      ...(baseToken.address.toUpperCase() !== ethToken.address.toUpperCase() ? [ethToken] : []),
      ...nonBaseOrEthExplorerTokens,
    ].map((token) => ({
      ...token,
      isETH: token.address.toUpperCase() === ethL2TokenAddress.toUpperCase(),
    }));
  });

  const tokens = computed<{ [tokenAddress: string]: Token } | undefined>(() => {
    if (!tokensRaw.value) return undefined;
    return Object.fromEntries(tokensRaw.value.map((token) => [token.address, token]));
  });
  const l1Tokens = computed<{ [tokenAddress: string]: Token } | undefined>(() => {
    if (!tokensRaw.value) return undefined;
    return Object.fromEntries(
      tokensRaw.value
        .filter((e) => e.l1Address)
        .map((token) => {
          const customBridgeToken = customBridgeTokens.find(
            (e) => eraNetwork.value.l1Network?.id === e.chainId && token.l1Address === e.l1Address
          );
          const name = customBridgeToken?.name || token.name;
          const symbol = customBridgeToken?.symbol || token.symbol;
          return [token.l1Address!, { ...token, name, symbol, l1Address: undefined, address: token.l1Address! }];
        })
    );
  });
  const baseToken = computed<Token | undefined>(() => {
    if (!tokensRaw.value) return undefined;
    return tokensRaw.value.find((token) => token.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase());
  });
  const ethToken = computed<Token | undefined>(() => {
    if (!tokensRaw.value) return undefined;
    return tokensRaw.value.find((token) => token.isETH);
  });

  return {
    l1Tokens,
    tokens,
    baseToken,
    ethToken,
    tokensRequestInProgress: computed(() => tokensRequestInProgress.value),
    tokensRequestError: computed(() => tokensRequestError.value),
    requestTokens,
    resetTokens,
  };
});
