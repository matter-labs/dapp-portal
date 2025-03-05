<template>
  <div class="my-4 flex flex-col px-2 text-xs">
    <div v-if="step.type.includes('onramp')" class="flex items-center space-x-2">
      <span class="h-4 w-4 rounded-full border bg-gray-500">&nbsp;</span>
      <span>Purchase via Kado.money</span>
    </div>
    <div v-if="step.type.includes('lifi')" class="flex items-center space-x-2">
      <img :src="step.swapQuote!.toolDetails.logoURI" class="h-4 w-4" />
      <span>{{ step.swapQuote!.toolDetails.name }} via LI.FI</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProviderQuoteOption } from "zksync-easy-onramp";

defineProps<{
  step: ProviderQuoteOption["steps"][0] & { swapQuote?: { toolDetails: { name: string } } };
}>();
</script>
