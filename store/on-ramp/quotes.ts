import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchQuotes as fetchSDKQuotes } from "zksync-easy-onramp";

import type { FetchQuoteParams, PaymentMethod, ProviderQuoteOption } from "zksync-easy-onramp";

export const useQuotesStore = defineStore("quotes", () => {
  const inProgress = ref(false);
  const error = ref<Error | null>(null);
  const quotes = ref<ProviderQuoteOption[] | null>(null);
  // const quoteFilter = ref<PaymentMethod[]>([]);
  const quoteFilter = useStorage<PaymentMethod[]>("quoteFilter", []);

  async function fetchQuotes(params: FetchQuoteParams) {
    inProgress.value = true;
    quotes.value = null;
    try {
      const response = await fetchSDKQuotes(params);
      if (!response.quotes) {
        throw new Error("Failed to fetch quotes");
      }
      quotes.value = response.quotes;
      error.value = null;
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err;
      } else {
        error.value = new Error(String(err));
      }
      quotes.value = [];
    } finally {
      inProgress.value = false;
    }
  }

  const reset = () => {
    quotes.value = null;
  };

  return {
    inProgress,
    fetchQuotes,
    error,
    quotes,
    reset,
    quoteFilter,
  };
});
