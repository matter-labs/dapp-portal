<template>
  <div id="list" class="-mt-5 max-h-[380px] overflow-y-auto rounded-b-2xl bg-transparent px-6 pb-10 pt-2">
    <div class="mb-2 flex flex-col">
      <div class="mb-2 text-lg font-bold">Payment methods</div>
      <QuoteFilter />
    </div>
    <div class="flex flex-col gap-2">
      <template v-if="quotes && quotes.length > 0">
        <template v-for="(providerQuotes, index) in filteredQuotes" :key="index">
          <QuotePreview
            v-for="(quote, quoteIndex) in providerQuotes.paymentMethods"
            :key="quoteIndex"
            :quote="quote!"
            :provider="providerQuotes.provider"
          />
        </template>
      </template>
      <template v-else-if="quotes && quotes.length === 0">
        <div class="h-10">No quotes available</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterByPaymentMethod, sortByFees, type ProviderQuoteOption } from "zksync-easy-onramp";

import QuoteFilter from "@/views/on-ramp/QuoteFilter.vue";
import QuotePreview from "@/views/on-ramp/QuotePreview.vue";

const { quotes, quoteFilter } = storeToRefs(useQuotesStore());
watchEffect(() => {
  if (quotes.value) {
    const sorted = sortByFees(quotes.value, false);
    filteredQuotes.value = filterByPaymentMethod(sorted, quoteFilter.value ?? []);
  }
});

const filteredQuotes = ref<ProviderQuoteOption[]>([]);
</script>

<style lang="scss" scoped>
#list {
  &::after {
    content: "";
    @apply absolute bottom-0 left-4 right-6 h-[1.25rem] w-auto bg-gradient-to-t from-[#e8ecf280] to-transparent dark:from-[#262b33e6];
  }
}
</style>
