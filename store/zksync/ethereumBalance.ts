import { getBalance } from "@wagmi/core";
import { utils } from "zksync-ethers";

import { l1Networks } from "@/data/networks";
import { wagmiConfig } from "@/data/wagmi";

import type { Hash, Token, TokenAmount } from "@/types";

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
      ...ethereumBalance.value.flatMap((e) => {
        const matchingTokens = Object.values(l1Tokens.value ?? {}).filter((token) => token.l1Address === e.address);

        if (matchingTokens.length === 0) {
          // If no match, return the original balance object
          return [
            {
              ...e,
              amount: e.amount,
            },
          ];
        }

        // If there are multiple matching tokens, return all of them with updated info
        return matchingTokens.map((token) => ({
          ...e,
          address: token.l1Address, // Use the L1 address to keep the same format
          l2Address: token.address, // Keep the L2 address
          symbol: token.symbol ?? e.symbol,
          name: token.name ?? e.name,
          iconUrl: token.iconUrl ?? e.iconUrl,
          price: token.price ?? e.price,
          ...(token.l1BridgeAddress ? { l1BridgeAddress: token.l1BridgeAddress } : {}),
          ...(token.l2BridgeAddress ? { l2BridgeAddress: token.l2BridgeAddress } : {}),
        }));
      }),

      ...Object.values(l1Tokens.value ?? [])
        .filter((token) => !ethereumBalance.value?.some((e) => e.address === token.l1Address))
        .map((e) => ({
          ...e,
          amount: "0",
        })),
    ].sort((a, b) => {
      if ((a as Token).address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()) return -1;
      if ((b as Token).address.toUpperCase() === utils.ETH_ADDRESS.toUpperCase()) return 1;
      return 0;
    }) as TokenAmount[];
  };
  const getBalancesFromRPC = async (): Promise<TokenAmount[]> => {
    await tokensStore.requestTokens();
    if (!l1Tokens.value) throw new Error("Tokens are not available");
    if (!account.value.address) throw new Error("Account is not available");

    if (!account.value.address) {
      return [];
    }

    return await Promise.all(
      Object.values(l1Tokens.value ?? []).map(async (token) => {
        const amount = await getBalance(wagmiConfig, {
          address: account.value.address!,
          chainId: l1Network.value!.id,
          token:
            token.l1Address?.toUpperCase() === utils.ETH_ADDRESS.toUpperCase() ? undefined : (token.l1Address! as Hash),
        });

        return {
          ...token,
          amount: amount.value.toString(),
          address: token.l1Address!, // Use the L1 address to keep the same format
          l2Address: token.address, // Keep the L2 address
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
