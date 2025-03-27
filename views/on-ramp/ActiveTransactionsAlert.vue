<template>
  <div
    v-if="routes.length > 0"
    class="flex cursor-pointer gap-2 rounded-xl bg-neutral-100 p-4 dark:bg-neutral-900"
    @click="viewTransactions"
  >
    <InformationCircleIcon class="h-6 w-6 dark:text-white" />
    <span class="grow">You have {{ routes.length }} active transaction{{ routes.length > 1 ? "s" : "" }}.</span>
    <ChevronRightIcon class="h-6 w-6 dark:text-white" />
  </div>
</template>

<script lang="ts" setup>
import { ChevronRightIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";

const { routes } = storeToRefs(useRoutesStore());
const { setStep } = useOnRampStore();
const viewTransactions = () => {
  setStep("transactions");
};
</script>
