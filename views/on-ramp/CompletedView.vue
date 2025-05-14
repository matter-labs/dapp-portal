<template>
  <CommonContentBlock v-if="order">
    <div class="flex flex-col items-center">
      <span class="mt-2 text-xl">Order completed successfully</span>
    </div>
    <!-- <div class="flex flex-col items-center">
      <TokenImage :chain-icon="chainIcon" :symbol="tokenSymbol" :icon-url="tokenIconUrl" class="mb-4 h-11 w-11" />
      <span>You have successfully received</span>
      <span class="mt-2 text-3xl" :title="finalValue[1] + ' ' + tokenSymbol"
        >{{ finalValue[0] }} {{ tokenSymbol }}</span
      >
    </div> -->
  </CommonContentBlock>
  <CommonButton :to="{ name: 'on-ramp' }" class="mt-4" variant="light" @click="reload">Add more funds</CommonButton>
</template>

<script lang="ts" setup>
const { order } = storeToRefs(useOrderProcessingStore());

/* import type { BigNumberish } from "ethers";
import type { StepExtended } from "zksync-easy-onramp";

const chainIcon = ref("/img/era.svg");

const finalValue = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  console.log("1 lastStep", lastStep, order.value);
  return formatTokenBalance(
    lastStep!.execution!.toAmount as BigNumberish,
    (lastStep!.execution!.toToken as { decimals: number }).decimals
  );
});
const tokenSymbol = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  console.log("2 lastStep", lastStep, order.value);
  return (lastStep!.execution!.toToken as { symbol: string }).symbol;
});
const tokenIconUrl = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  console.log("3 lastStep", lastStep, order.value);
  return (lastStep!.execution!.toToken as { logoURI: string }).logoURI;
}); */

const reload = () => {
  window.location.reload();
};
</script>
