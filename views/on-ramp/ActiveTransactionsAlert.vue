<template>
  <div
    v-if="routes.length > 0"
    class="flex cursor-pointer gap-2 rounded-xl border border-red-700/30 bg-red-500/10 p-4 dark:bg-red-900/50"
    @click="viewTransactions"
  >
    <span class="grow">You have {{ routes.length }} active transaction{{ routes.length > 1 ? "s" : "" }}.</span>
    <ChevronRightIcon class="h-6 w-6 text-red-700" />
  </div>
</template>

<script lang="ts" setup>
import { ChevronRightIcon } from "@heroicons/vue/20/solid";
const { routes } = useRoutesStore();

const { setStep } = useOnRampStore();
const viewTransactions = () => {
  setStep("transactions");
};
</script>
