<template>
  <div id="list" class="max-h-[280px] overflow-y-auto px-6 py-4">
    <span class="font-bold">Choose on-ramp</span>
    <div class="flex flex-col gap-2">
      <QuotePreview v-for="(quote, index) in quotes" :key="index" :quote="quote" />
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
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1.25rem;
    background-image: linear-gradient(to top, #f7f9fc, rgba(#f7f9fc, 0));
  }
}

.dark #list {
  &::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1.25rem;
    background-image: linear-gradient(to top, #000, rgba(#000, 0));
  }
}
</style>
