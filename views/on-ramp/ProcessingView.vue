<template>
  <div class="-mt-5 max-h-[380px] overflow-y-auto rounded-b-2xl bg-transparent px-6 py-4 pt-8">
    <div v-if="order">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <CommonSpinner v-if="purchaseStepStatusActive" class="-ml-1 mr-3 size-5" variant="text-color" />
          <CheckIcon v-if="purchaseStepStatusComplete" class="mr-2 h-4 w-4" />
          <ExclamationCircleIcon v-if="purchaseStepStatusIncomplete" class="mr-2 h-4 w-4" />
          <span class="font-bold">Purchasing {{ tokenPurchase }}</span>
        </div>
        <div v-if="orderStatus === 'STOPPED' && !inProgress">
          <CommonButton size="xs" variant="cancel" @click="removeTransaction"
            ><TrashIcon class="h-6 w-6"
          /></CommonButton>
        </div>
      </div>
      <div class="mt-6">
        <div class="m-auto flex w-[80%] flex-col">
          <div v-for="process in order.steps[0].execution?.process" :key="process.type" class="mb-4 flex gap-2">
            <div class="w-[24px] shrink-0 text-center">
              <ProcessStatusIcon :status="process.status" />
            </div>
            <div class="flex items-center text-sm">{{ process.message }}</div>
          </div>
        </div>
      </div>
      <div v-if="order && !!order.steps[1]" class="mt-2 flex items-center justify-between">
        <div class="flex items-center">
          <CommonSpinner v-if="swapStepStatusActive" class="-ml-1 mr-3 size-5" variant="text-color" />
          <CheckIcon v-if="swapStepStatusComplete" class="mr-2 h-4 w-4" />
          <ExclamationCircleIcon v-if="swapStepStatusIncomplete" class="mr-2 h-4 w-4" />
          <span class="font-bold">Swapping ETH to {{ order.receive.token.symbol }}</span>
        </div>
      </div>
      <div v-if="order && !!order.steps[1]" class="mt-6">
        <div class="m-auto flex w-[80%] flex-col">
          <div v-for="process in order.steps[1].execution?.process" :key="process.type" class="mb-4 flex gap-2">
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
      <CommonButton variant="cancel" @click="cancelTransaction"> Cancel </CommonButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TrashIcon } from "@heroicons/vue/20/solid";
import { CheckIcon, ExclamationCircleIcon } from "@heroicons/vue/24/outline";
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
const cancelTransaction = () => {
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

const tokenPurchase = computed(() => {
  if (order.value && order.value.steps.length > 1) {
    return "ETH";
  } else {
    return order.value?.receive.token.symbol;
  }
});

// "ACTION_REQUIRED" | "PENDING" | "FAILED" | "DONE"
const purchaseStepStatusActive = computed(() => {
  return order.value?.steps[0].execution?.process.some((process) =>
    ["PENDING", "ACTION_REQUIRED"].includes(process.status)
  );
});

const purchaseStepStatusComplete = computed(() => {
  return order.value?.steps[0].execution?.process.every((process) => ["DONE"].includes(process.status));
});

const purchaseStepStatusIncomplete = computed(() => {
  return order.value?.steps[0].execution?.process.some((process) => ["FAILED", "CANCELLED"].includes(process.status));
});

const swapStepStatusActive = computed(() => {
  return order.value?.steps[1].execution?.process.some((process) =>
    ["PENDING", "ACTION_REQUIRED"].includes(process.status)
  );
});

const swapStepStatusComplete = computed(() => {
  return order.value?.steps[1].execution?.process.every((process) => ["DONE"].includes(process.status));
});
const swapStepStatusIncomplete = computed(() => {
  return order.value?.steps[1].execution?.process.some((process) => ["FAILED", "CANCELLED"].includes(process.status));
});

onBeforeUnmount(() => {
  updateRouteExecution(order.value!, { executeInBackground: true });
});
</script>
