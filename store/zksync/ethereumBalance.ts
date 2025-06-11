import { getBalance } from "@wagmi/core";
import { utils } from "zksync-ethers";

import { l1Networks } from "@/data/networks";
import { wagmiConfig } from "@/data/wagmi";

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
    return [
      ...ethereumBalance.value.map((e) => {
        const tokenFromExplorer = l1Tokens.value?.[e.address];
        return {
          ...e,
          symbol: tokenFromExplorer?.symbol ?? e.symbol,
          name: tokenFromExplorer?.name ?? e.name,
          iconUrl: tokenFromExplorer?.iconUrl ?? e.iconUrl,
          price: tokenFromExplorer?.price ?? e.price,
        };
      }),
      ...Object.values(l1Tokens.value ?? []) // Add tokens that are not in Ankr API
        .filter((token) => !ethereumBalance.value?.find((e) => e.address === token.address))
        .map((e) => ({
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
          token: token.address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase() ? undefined : (token.address! as Hash),
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
        return await getBalancesFromApi();
      } else {
        return await getBalancesFromRPC();
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
