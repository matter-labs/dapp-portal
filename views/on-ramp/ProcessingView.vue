<template>
  <div class="-mt-5 max-h-[280px] overflow-y-auto rounded-b-2xl bg-white px-6 py-4 pt-8 dark:bg-neutral-950">
    <div>
      <div class="flex items-center">
        <CommonSpinner class="-ml-1 mr-3 size-5" variant="text-color" />
        <span class="font-bold">Purchasing</span>
      </div>
      <div v-if="order" class="mt-6">
        <div v-for="step in order.steps" :key="step.id" class="m-auto flex w-[80%] flex-col">
          <div v-for="process in step.execution?.process" :key="process.type" class="mb-4 flex gap-2">
            <div class="w-[24px] shrink-0 text-center">
              <ProcessStatusIcon :status="process.status" />
            </div>
            <div class="flex items-center text-sm">{{ process.message }}</div>
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
