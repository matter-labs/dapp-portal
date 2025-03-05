<template>
  <CommonContentBlock v-if="order">
    <div class="flex flex-col items-center">
      <TokenImage :chain-icon="chainIcon" :symbol="tokenSymbol" :icon-url="tokenIconUrl" class="mb-4 h-11 w-11" />
      <span>You have successfully received</span>
      <span class="mt-2 text-3xl" :title="finalValue[1] + ' ' + tokenSymbol"
        >{{ finalValue[0] }} {{ tokenSymbol }}</span
      >
      <span></span>
    </div>
  </CommonContentBlock>
  <CommonButton :to="{ name: 'on-ramp' }" class="mt-4 text-gray-500 underline" variant="light" @click="reload">
    On-ramp again
  </CommonButton>
</template>

<script lang="ts" setup>
import CommonButton from "@/components/common/button/Button.vue";
import CommonContentBlock from "@/components/common/ContentBlock.vue";

import type { BigNumberish } from "ethers";
import type { StepExtended } from "zksync-easy-onramp";

const chainIcon = ref("/img/era.svg");

const { order } = storeToRefs(useOrderProcessingStore());
const finalValue = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  return formatTokenBalance(
    lastStep!.execution!.toAmount as BigNumberish,
    (lastStep!.execution!.toToken as { decimals: number }).decimals
  );
});
const tokenSymbol = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  return (lastStep!.execution!.toToken as { symbol: string }).symbol;
});
const tokenIconUrl = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  return (lastStep!.execution!.toToken as { logoURI: string }).logoURI;
});

const reload = () => {
  window.location.reload();
};
</script>
