import { getBalance } from "@wagmi/core";
import { utils } from "zksync-ethers";

import { l1Networks } from "@/data/networks";
import { wagmiConfig } from "@/data/wagmi";
import { getBalancesWithCustomBridgeTokens, AddressChainType } from "@/utils/helpers";

import type { Hash, TokenAmount } from "@/types";

export const useZkSyncEthereumBalanceStore = defineStore("zkSyncEthereumBalances", () => {
  const portalRuntimeConfig = usePortalRuntimeConfig();

  const onboardStore = useOnboardStore();
  const ethereumBalancesStore = useEthereumBalanceStore();
  const tokensStore = useZkSyncTokensStore();
  const { l1Network, selectedNetwork } = storeToRefs(useNetworkStore());
  const { account } = storeToRefs(onboardStore);
  const { balance: ethereumBalance } = storeToRefs(ethereumBalancesStore);
  const { l1Tokens } = storeToRefs(tokensStore);

  const getBalancesFromApi = async (): Promise<TokenAmount[]> => {
    await Promise.all([ethereumBalancesStore.requestBalance(), tokensStore.requestTokens()]);

    if (!ethereumBalance.value) throw new Error("Ethereum balances are not available");

    // Get balances from Ankr API and merge them with tokens data from explorer
    // Special handling: if base token is ETH but has different L1 address than standard ETH,
    // merge Ankr's standard ETH balance with the base token entry to avoid duplicates
    const baseETHToken = Object.values(l1Tokens.value ?? []).find((token) => token.isETH);
    const ankrStandardETH = ethereumBalance.value.find(
      (e) => e.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()
    );
    const shouldMergeETH =
      baseETHToken && ankrStandardETH && baseETHToken.address.toUpperCase() !== ankrStandardETH.address.toUpperCase();

    const tokensNotInAnkr = Object.values(l1Tokens.value ?? []).filter((token) => {
      const existsInAnkr = ethereumBalance.value?.find((e) => e.address === token.address);
      // If this is the base ETH token and we're merging with Ankr's standard ETH, don't add it separately
      if (shouldMergeETH && token.address === baseETHToken?.address) {
        return false;
      }
      return !existsInAnkr;
    });

    return [
      ...ethereumBalance.value.map((e) => {
        const tokenFromExplorer = l1Tokens.value?.[e.address];
        // If this is Ankr's standard ETH and we need to merge with base token, use base token's address
        if (shouldMergeETH && e.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()) {
          return {
            ...e,
            address: baseETHToken!.address, // Use base token's L1 address
            symbol: baseETHToken!.symbol,
            name: baseETHToken!.name,
            iconUrl: baseETHToken!.iconUrl ?? e.iconUrl,
            price: tokenFromExplorer?.price ?? e.price,
            isETH: true,
          };
        }
        return {
          ...e,
          symbol: tokenFromExplorer?.symbol ?? e.symbol,
          name: tokenFromExplorer?.name ?? e.name,
          iconUrl: tokenFromExplorer?.iconUrl ?? e.iconUrl,
          price: tokenFromExplorer?.price ?? e.price,
        };
      }),
      ...tokensNotInAnkr.map((e) => ({
        ...e,
        amount: "0",
      })),
    ].sort((a, b) => {
      if (a.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()) return -1; // Always bring ETH to the beginning
      if (b.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()) return 1; // Keep ETH at the beginning if comparing with any other token
      return 0; // Keep other tokens' order unchanged
    });
  };
  const getBalancesFromRPC = async (): Promise<TokenAmount[]> => {
    await tokensStore.requestTokens();
    if (!l1Tokens.value) throw new Error("Tokens are not available");
    if (!account.value.address) throw new Error("Account is not available");

    return await Promise.all(
      Object.values(l1Tokens.value ?? []).map(async (token) => {
        const amount = await getBalance(wagmiConfig, {
          address: account.value.address!,
          chainId: l1Network.value!.id,
          token:
            token.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase() ||
            token.address.toUpperCase() === utils.ETH_ADDRESS_IN_CONTRACTS.toUpperCase()
              ? undefined
              : (token.address! as Hash),
        });
        return {
          ...token,
          amount: amount.value.toString(),
        };
      })
    );
  };
  const {
    result: balance,
    inProgress: balanceInProgress,
    error: balanceError,
    execute: requestBalance,
    reset: resetBalance,
  } = usePromise<TokenAmount[]>(
    async () => {
      if (!l1Network.value) throw new Error(`L1 network is not available on ${selectedNetwork.value.name}`);

      if (
        ([l1Networks.mainnet.id, l1Networks.sepolia.id] as number[]).includes(l1Network.value?.id) &&
        portalRuntimeConfig.ankrToken
      ) {
        const apiBalances = await getBalancesFromApi();
        return getBalancesWithCustomBridgeTokens(apiBalances, AddressChainType.L1);
      } else {
        const rpcBalances = await getBalancesFromRPC();
        return getBalancesWithCustomBridgeTokens(rpcBalances, AddressChainType.L1);
      }
    },
    { cache: 30000 }
  );

  onboardStore.subscribeOnAccountChange(() => {
    resetBalance();
  });

  return {
    balance,
    balanceInProgress,
    balanceError,
    requestBalance,

    deductBalance: ethereumBalancesStore.deductBalance,
  };
});
