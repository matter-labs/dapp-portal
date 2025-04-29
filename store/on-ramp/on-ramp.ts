import { useAsyncState } from "@vueuse/core";
import { getWalletClient, switchChain } from "@wagmi/core";
import { defineStore } from "pinia";
import { ref } from "vue";
import { createOnRampConfig, EVM, fetchConfig, type FetchQuoteParams } from "zksync-easy-onramp";

import { defaultNetwork } from "@/data/networks";
import { wagmiConfig } from "@/data/wagmi";
import { useQuotesStore } from "@/store/on-ramp/quotes";

const devEnv = process.env.NODE_ENV === "development" || process.env.ONRAMP_STAGING === "true";

createOnRampConfig({
  integrator: "ZKsync Portal",
  apiUrl: devEnv ? "https://easy-onramp-api-staging.zksync.dev/api" : "https://easy-onramp-api.zksync.dev/api",
  provider: EVM({
    // eslint-disable-next-line require-await
    getWalletClient: async () => getWalletClient(wagmiConfig),
    switchChain: async (chainId) => {
      const chain = await switchChain(wagmiConfig, { chainId });
      return await getWalletClient(wagmiConfig, { chainId: chain.id });
    },
  }),
  dev: devEnv,
});

export type Steps = "buy" | "quotes" | "processing" | "transactions" | "transaction" | "complete";

export const useOnRampStore = defineStore("on-ramp", () => {
  const onRampChainId = defaultNetwork.id;
  const step = ref<Steps>("buy");

  const quotesStore = useQuotesStore();
  const middlePanelHeight = ref(0);

  const setStep = function (newStep: Steps) {
    step.value = newStep;
  };

  const fetchQuotes = function (params: FetchQuoteParams) {
    setStep("quotes");
    quotesStore.fetchQuotes(params);
  };

  const {
    state: config,
    isReady: configIsReady,
    isLoading: configInProgress,
    error: configError,
  } = useAsyncState(fetchConfig(), {
    tokens: [],
    fiatCurrencies: [],
    chains: [],
    providers: [],
  });

  const reset = () => {
    setStep("buy");
    middlePanelHeight.value = 0;
  };

  return {
    onRampChainId,
    setStep,
    step,
    fetchQuotes,
    middlePanelHeight,
    config,
    configIsReady,
    configInProgress,
    configError,
    reset,
  };
});
