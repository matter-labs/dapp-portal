<template>
  <div
    id="middle-panel"
    class="relative !-mt-6 w-full rounded-b-3xl border border-neutral-200 bg-neutral-100/50 pb-6 pt-12 dark:border-neutral-800 dark:bg-neutral-900/90"
  >
    <Transition tag="div" class="relative" v-bind="TransitionOpacity(250, 150)">
      <div v-if="step === 'buy' || step === 'quotes'">
        <TransitionGroup
          id="middle-panel-container"
          tag="div"
          class="relative"
          :style="{ height: middlePanelHeight + 'px' }"
          @enter="swapView"
        >
          <div v-for="view in transitionViews" v-show="activeView === view" :key="view">
            <LoadingTransition v-if="view === 'loading'" />
            <div v-if="view === 'error'" class="m-4 text-center">An error has occurred. Please try again.</div>
            <QuotesList v-if="view === 'quotes'" />
            <div v-if="view === 'connect' && !isConnected" class="flex flex-col items-center p-4">
              <CommonButton variant="primary" @click="openModal">Connect wallet to continue</CommonButton>
            </div>
          </div>
        </TransitionGroup>
      </div>
      <ProcessingView v-else-if="step === 'processing'" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";

import LoadingTransition from "@/views/on-ramp/LoadingTransition.vue";
import ProcessingView from "@/views/on-ramp/ProcessingView.vue";
import QuotesList from "@/views/on-ramp/QuotesList.vue";

const activeView = defineModel({ required: true, default: "initial" });

const { openModal } = useOnboardStore();
const { isConnected } = storeToRefs(useOnboardStore());
watch(
  isConnected,
  (connected) => {
    if (!connected) {
      activeView.value = "connect";
    }
  },
  { immediate: true }
);

const { step } = storeToRefs(useOnRampStore());

const transitionViews = ["initial", "loading", "quotes", "error", "connect"] as const;

const { middlePanelHeight } = storeToRefs(useOnRampStore());
function swapView(el: Element) {
  const height = (el as HTMLElement).offsetHeight;
  middlePanelHeight.value = height;
}
useEventListener("resize", () => {
  const activeElement = document.querySelector("#middle-panel-container > div:not([style*='display: none'])");
  if (activeElement) {
    swapView(activeElement);
  }
});
const { quoteFilter } = storeToRefs(useQuotesStore());
watch(quoteFilter, () => {
  setTimeout(() => {
    const activeElement = document.querySelector("#list");
    if (activeElement) {
      swapView(activeElement);
    }
  }, 0);
});

const { quotes, inProgress, error } = storeToRefs(useQuotesStore());
watchEffect(() => {
  if (inProgress.value) {
    activeView.value = "loading";
  }
  if (quotes.value) {
    activeView.value = "quotes";
  }
  if (error.value) {
    activeView.value = "error";
  }
});
</script>

<style lang="scss" scoped>
.dark #list {
  scrollbar-color: #6c7380 #262b33e6;
}
</style>
