<template>
  <div class="max-h-[280px] overflow-y-auto px-6 py-4">
    <div>
      <svg
        class="-ml-1 mr-3 inline-block size-5 animate-spin text-black dark:text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <span class="font-bold">Purchasing</span>
      <div v-if="order" class="mt-6">
        <div v-for="step in order.steps" :key="step.id" class="m-auto flex w-[80%] flex-col">
          <div v-for="process in step.execution?.process" :key="process.type" class="mb-4 flex gap-2">
            <div class="w-[24px] shrink-0 text-center">
              <ProcessStatusIcon :status="process.status" />
            </div>
            <div class="flex items-center text-xs">{{ process.message }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="orderStatus === 'STOPPED' && !inProgress" class="flex items-center gap-2">
      <CommonButton variant="primary" class="grow" @click="restartRoute"> Try again </CommonButton>
      <CommonButton variant="cancel" @click="removeTransaction"> Cancel </CommonButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { updateRouteExecution } from "zksync-easy-onramp";

import CommonButton from "@/components/common/button/Button.vue";
import { useOrderProcessingStore } from "@/store/on-ramp/order-processing";
import ProcessStatusIcon from "@/views/on-ramp/ProcessStatusIcon.vue";

const { order, inProgress, orderStatus } = storeToRefs(useOrderProcessingStore());
const { execute } = useOrderProcessingStore();

const restartRoute = () => {
  execute();
};

const { setStep } = useOnRampStore();
const { removeRoute } = useRoutesStore();
const removeTransaction = () => {
  const routeId = order.value!.id;
  removeRoute(routeId);
  setStep("buy");
};

const initializing = ref<boolean>(true);
onMounted(() => {
  setTimeout(() => {
    initializing.value = false;
    if (orderStatus.value !== "DONE") {
      if (orderStatus.value !== "STOPPED") {
        execute();
      }
    }
  }, 1000);
});

onBeforeUnmount(() => {
  updateRouteExecution(order.value!, { executeInBackground: true });
});
</script>
