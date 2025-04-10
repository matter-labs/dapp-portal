<template>
  <div id="list" class="-mt-5 max-h-[320px] overflow-y-auto rounded-b-2xl bg-white px-6 pb-10 pt-7 dark:bg-neutral-950">
    <div class="mb-2 text-lg font-bold">Choose on-ramp</div>
    <div class="flex flex-col gap-2">
      <template v-if="quotes && quotes.length > 0">
        <template v-for="(providerQuotes, index) in sortedQuotes" :key="index">
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
import { sortByFees } from "zksync-easy-onramp";

import QuotePreview from "@/views/on-ramp/QuotePreview.vue";

const { quotes } = storeToRefs(useQuotesStore());

const sortedQuotes = computed(() => {
  if (quotes.value) {
    return sortByFees(quotes.value, false);
  }
  return [];
});
</script>

<style lang="scss" scoped>
#list {
  &::after {
    content: "";
    @apply absolute bottom-0 left-0 h-[1.25rem] w-full bg-gradient-to-t from-[#f7f9fc] to-transparent dark:from-black;
  }
}
</style>
