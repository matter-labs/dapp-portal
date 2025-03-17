<template>
  <div
    class="cursor-pointer rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200/50 dark:border-neutral-800/70 dark:bg-neutral-900 dark:hover:bg-neutral-800/80"
    @click="runQuote"
  >
    <div class="flex gap-2 p-3">
      <div class="basis-2/3">
        <div>
          <div :title="balance[1]" class="font-bold">{{ balance[0] }} {{ quote.receive.token.symbol }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">
            Fee: {{ formatFiat(quote.pay.totalFeeUsd, quote.pay.currency) }}
          </div>
          <button
            type="button"
            class="p-0.5 text-sm text-neutral-500 underline hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-400"
            @click="toggleDetails"
          >
            Details
          </button>
        </div>
      </div>
      <div class="flex basis-1/3 items-center justify-end">
        <!-- <div class="inline-block p-2">
          <img :src="quote.provider.iconUrl" class="h-8 w-8" />
        </div> -->
        <div class="inline-block">
          <div>{{ quote.provider.name }}</div>
          <div class="text-sm text-gray-600 dark:text-gray-300">{{ providerType }}</div>
        </div>
      </div>
    </div>
    <Transition v-bind="TransitionOpacity(250, 150)">
      <div v-if="toggleOpen" ref="quotePreview">
        <StepDetail v-for="(step, index) in quote.steps" :key="index" :step="step" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useOrderProcessingStore } from "@/store/on-ramp/order-processing";
import StepDetail from "@/views/on-ramp/StepDetail.vue";

import type { ProviderQuoteOption } from "zksync-easy-onramp";

const props = defineProps<{
  quote: ProviderQuoteOption;
}>();

const balance = computed(() => {
  return formatTokenBalance(props.quote.receive.amountUnits, props.quote.receive.token.decimals);
});

const providerType = computed(() => {
  switch (props.quote.provider.type) {
    case "onramp":
      return "Fiat on-ramp";
    case "cex":
      return "Buy or deposit";
    default:
      return "Provider";
  }
});

const toggleOpen = ref(false);
function toggleDetails(e: Event) {
  e.stopPropagation();
  toggleOpen.value = !toggleOpen.value;
}

const quotePreview = ref<HTMLElement>();
const { middlePanelHeight } = storeToRefs(useOnRampStore());
const toggleHeight = ref(0);
watch(toggleOpen, () => {
  setTimeout(() => {
    if (toggleOpen.value) {
      toggleHeight.value = quotePreview.value?.offsetHeight || 0;
      middlePanelHeight.value += toggleHeight.value + 30;
    } else {
      middlePanelHeight.value -= toggleHeight.value + 30;
    }
  }, 0);
});

const { setStep } = useOnRampStore();
const { selectQuote } = useOrderProcessingStore();
function runQuote() {
  selectQuote(props.quote);
  setStep("processing");
}
</script>
