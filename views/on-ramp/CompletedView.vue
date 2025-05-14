<template>
  <CommonContentBlock v-if="order">
    <div class="flex flex-col items-center">
      <span class="mt-2 text-xl">Order completed successfully!</span>
    </div>
    <div class="flex flex-col items-center">
      <TokenImage :chain-icon="chainIcon" :symbol="tokenSymbol" :icon-url="tokenIconUrl" class="mb-4 h-11 w-11" />
      <span>You have successfully received</span>
      <span class="mt-2 text-3xl" :title="finalValue[1] + ' ' + tokenSymbol"
        >{{ finalValue[0] }} {{ tokenSymbol }}</span
      >
    </div>
  </CommonContentBlock>
  <CommonButton :to="{ name: 'on-ramp' }" class="mt-4" variant="light" @click="reload">Add more funds</CommonButton>
</template>

<script lang="ts" setup>
import type { BigNumberish } from "ethers";
import type { StepExtended } from "zksync-easy-onramp";

const { order } = storeToRefs(useOrderProcessingStore());

const chainIcon = ref("/img/era.svg");

const { selectedToken } = storeToRefs(useOnRampStore());

const finalValue = computed(() => {
  const lastStep: StepExtended = order.value!.steps[order.value!.steps.length - 1];
  return formatTokenBalance(lastStep!.execution!.toAmount as BigNumberish, selectedToken.value!.decimals);
});
const tokenSymbol = computed(() => selectedToken.value!.symbol);
const tokenIconUrl = computed(() => selectedToken.value!.iconUrl);

const reload = () => {
  window.location.reload();
};
</script>
