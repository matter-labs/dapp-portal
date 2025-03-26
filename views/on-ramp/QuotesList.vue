<template>
  <div id="list" class="-mt-5 max-h-[280px] overflow-y-auto rounded-b-2xl bg-neutral-950 px-6 py-4 pt-7">
    <div class="mb-2 text-lg font-bold">Choose on-ramp</div>
    <div class="flex flex-col gap-2">
      <template v-if="quotes && quotes.length > 0">
        <QuotePreview v-for="(quote, index) in quotes" :key="index" :quote="quote" />
      </template>
      <template v-else-if="quotes && quotes.length === 0">
        <div class="h-10">No quotes available</div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import QuotePreview from "@/views/on-ramp/QuotePreview.vue";

const { quotes } = storeToRefs(useQuotesStore());
</script>

<style lang="scss" scoped>
#list {
  &::after {
    content: "";
    @apply absolute bottom-0 left-0 h-[1.25rem] w-full bg-gradient-to-t from-[#f7f9fc] to-transparent;
  }
}

.dark #list {
  &::after {
    content: "";
    @apply absolute bottom-0 left-0 h-[1.25rem] w-full bg-gradient-to-t from-black to-transparent;
  }
}
</style>
