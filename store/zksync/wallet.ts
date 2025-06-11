import { ethers } from "ethers";
import { $fetch } from "ofetch";
import { L1Signer, L1VoidSigner, BrowserProvider, Signer } from "zksync-ethers";

import { customBridgeTokens } from "@/data/customBridgeTokens";
import { getBalancesWithCustomBridgeTokens, AddressChainType } from "@/utils/helpers";

import type { Api, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

export const useZkSyncWalletStore = defineStore("zkSyncWallet", () => {
  const onboardStore = useOnboardStore();
  const providerStore = useZkSyncProviderStore();
  const tokensStore = useZkSyncTokensStore();
  const { eraNetwork } = storeToRefs(providerStore);
  const { tokens } = storeToRefs(tokensStore);
  const { account } = storeToRefs(onboardStore);
  const { validateAddress } = useScreening();

  const { execute: getSigner, reset: resetSigner } = usePromise(async () => {
    const walletNetworkId = account.value.chain?.id;
    if (walletNetworkId !== eraNetwork.value.id) {
      throw new Error(
        `Incorrect wallet network selected: #${walletNetworkId} (expected: ${eraNetwork.value.name} #${eraNetwork.value.id})`
      );
    }

    const web3Provider = new BrowserProvider((await onboardStore.getWallet(eraNetwork.value.id)) as any, "any");
    const rawEthersSigner = await web3Provider.getSigner();
    const eraL2Signer = Signer.from(rawEthersSigner, Number(eraNetwork.value.id), providerStore.requestProvider());

    return eraL2Signer;
  });
  const { execute: getL1Signer, reset: resetL1Signer } = usePromise(async () => {
    if (!eraNetwork.value.l1Network) throw new Error(`L1 network is not available on ${eraNetwork.value.name}`);

    const walletNetworkId = account.value.chain?.id;
    if (walletNetworkId !== eraNetwork.value.l1Network.id) {
      throw new Error(
        `Incorrect wallet network selected: #${walletNetworkId} (expected: ${eraNetwork.value.l1Network.name} #${eraNetwork.value.l1Network.id})`
      );
    }

    const web3Provider = new ethers.BrowserProvider((await onboardStore.getWallet()) as any, "any");
    const eraL1Signer = L1Signer.from(await web3Provider.getSigner(), providerStore.requestProvider());
    return eraL1Signer;
  });
  const getL1VoidSigner = (anyAddress = false) => {
    if (!account.value.address && !anyAddress) throw new Error("Address is not available");

    const web3Provider = new ethers.BrowserProvider(onboardStore.getPublicClient() as any, "any");
    return new L1VoidSigner(
      account.value.address || L2_BASE_TOKEN_ADDRESS,
      web3Provider,
      providerStore.requestProvider()
    ) as unknown as L1Signer;
  };

  const {
    result: accountState,
    execute: requestAccountState,
    reset: resetAccountState,
  } = usePromise<Api.Response.Account | Api.Response.Contract>(async () => {
    if (!account.value.address) throw new Error("Account is not available");
    if (!eraNetwork.value.blockExplorerApi)
      throw new Error(`Block Explorer API is not available on ${eraNetwork.value.name}`);

    return await $fetch(`${eraNetwork.value.blockExplorerApi}/address/${account.value.address}`);
  });

  const getBalancesFromBlockExplorerApi = async (): Promise<TokenAmount[]> => {
    await Promise.all([requestAccountState({ force: true }), tokensStore.requestTokens()]);
    if (!accountState.value) throw new Error("Account state is not available");
    if (!tokens.value) throw new Error("Tokens are not available");
    return Object.entries(accountState.value.balances)
      .filter(([tokenAddress, { token }]) => token || tokens.value?.[tokenAddress])
      .map(([tokenAddress, { balance, token }]) => {
        const tokenInfo = token ? mapApiToken(token) : tokens.value?.[tokenAddress];
        return {
          address: tokenInfo!.address,
          l1Address: tokenInfo!.l1Address || undefined,
          name: tokenInfo!.name || undefined,
          symbol: tokenInfo!.symbol!,
          decimals: tokenInfo!.decimals,
          iconUrl: tokenInfo!.iconUrl || undefined,
          price: tokenInfo?.price || undefined,
          amount: balance,
          l1BridgeAddress: tokenInfo?.l1BridgeAddress,
          l2BridgeAddress: tokenInfo?.l2BridgeAddress,
        };
      });
  };
  const getBalancesFromRPC = async (): Promise<TokenAmount[]> => {
    await tokensStore.requestTokens();
    if (!tokens.value) throw new Error("Tokens are not available");
    if (!account.value.address) throw new Error("Account is not available");

    const provider = providerStore.requestProvider();
    const balances = await Promise.all(
      Object.entries(tokens.value).map(async ([, token]) => {
        const amount = await provider.getBalance(onboardStore.account.address!, undefined, token.address);
        return {
          ...token,
          amount: amount.toString(),
        };
      })
    );

    return balances.map((balance) => {
      const customToken = customBridgeTokens.find(
        (token) => token.l2Address.toUpperCase() === balance.address.toUpperCase()
      );
      if (customToken) {
        return {
          ...balance,
          ...customToken,
        };
      }
      return balance;
    });
  };
  const {
    result: balancesResult,
    inProgress: balanceInProgress,
    error: balanceError,
    execute: requestBalance,
    reset: resetBalance,
  } = usePromise<TokenAmount[]>(
    async () => {
      if (eraNetwork.value.blockExplorerApi) {
        return await getBalancesFromBlockExplorerApi();
      } else {
        return await getBalancesFromRPC();
      }
    },
    { cache: 30000 }
  );

  const balance = computed<TokenAmount[]>(() => {
    if (!balancesResult.value) return [];

    const knownTokens: TokenAmount[] = Object.entries(tokens.value ?? {})
      .map(([, token]) => {
        const amount = balancesResult.value!.find((e) => e.address === token.address)?.amount ?? "0";
        return { ...token, amount };
      })
      .sort((a, b) => {
        if (a.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()) return -1; // Always bring ETH to the beginning
        if (b.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()) return 1; // Keep ETH at the beginning if comparing with any other token
        return 0; // Keep other tokens' order unchanged
      });
    const knownTokenAddresses = new Set(knownTokens.map((token) => token.address));

    // Filter out the tokens in `balancesResult` that are not in `tokens`
    const otherTokens = balancesResult.value
      .filter((token) => !knownTokenAddresses.has(token.address))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    const sortedTokens = [...knownTokens, ...otherTokens].sort((a, b) => {
      if (a.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()) return -1; // Always bring ETH to the beginning
      if (b.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()) return 1; // Keep ETH at the beginning if comparing with any other token

      const aPrice = a.price ? Number(a.price) : 0;
      const aAmount = a.amount ? Number(a.amount) : 0;
      const bPrice = b.price ? Number(b.price) : 0;
      const bAmount = b.amount ? Number(b.amount) : 0;
      const aValue = aPrice * aAmount;
      const bValue = bPrice * bAmount;

      return bValue - aValue;
    });

    return getBalancesWithCustomBridgeTokens(sortedTokens, AddressChainType.L2);
  });

  const deductBalance = (tokenAddress: string, amount: BigNumberish) => {
    if (!balance.value) return;
    const tokenBalance = getBalancesWithCustomBridgeTokens(balance.value, AddressChainType.L2).find(
      (balance) => balance.address === tokenAddress
    );
    if (!tokenBalance) return;
    const newBalance = BigInt(tokenBalance.amount) - BigInt(amount);
    tokenBalance.amount = newBalance < 0n ? "0" : newBalance.toString();
  };

  const isCorrectNetworkSet = computed(() => {
    const walletNetworkId = account.value.chain?.id;
    return walletNetworkId === eraNetwork.value.id;
  });
  const {
    inProgress: switchingNetworkInProgress,
    error: switchingNetworkError,
    execute: switchNetwork,
  } = usePromise(
    async () => {
      return await onboardStore.switchNetworkById(eraNetwork.value.id, eraNetwork.value.name);
    },
    { cache: false }
  );
  const setCorrectNetwork = async () => {
    return await switchNetwork().catch(() => undefined);
  };

  const { execute: walletAddressValidate, reload: reloadWalletAddressValidation } = usePromise(async () => {
    if (!account.value.address) throw new Error("Account is not available");
    await validateAddress(account.value.address); // Throws an error if the address is not valid
  });
  walletAddressValidate().catch(() => undefined);

  onboardStore.subscribeOnAccountChange(() => {
    resetSigner();
    resetL1Signer();
    resetAccountState();
    resetBalance();
    reloadWalletAddressValidation().catch(() => undefined);
  });

  return {
    getSigner,
    getL1Signer,
    getL1VoidSigner,

    balance,
    balanceInProgress: computed(() => balanceInProgress.value),
    balanceError: computed(() => balanceError.value),
    requestBalance,
    deductBalance,

    isCorrectNetworkSet,
    switchingNetworkInProgress,
    switchingNetworkError,
    setCorrectNetwork,

    walletAddressValidate,
  };
});
