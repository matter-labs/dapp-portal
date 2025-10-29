<template>
  <div class="fee-details-container">
    <span>{{ label }}&nbsp;</span>
    <div class="flex flex-col items-end xs:flex-row xs:items-center">
      <div class="flex items-center" data-testid="fee-amount">
        <template v-if="loading">
          <CommonContentLoader :length="30" />
        </template>
        <component
          :is="canDisplayFeeAsFiat ? 'button' : 'span'"
          v-else-if="feeToken && feeAmount"
          v-tooltip="canDisplayFeeAsFiat ? $t('transaction.clickToToggle') : ''"
          type="button"
          class="flex items-center"
          :class="{ 'cursor-pointer': canDisplayFeeAsFiat }"
          @click="displayFeeAsFiat = !displayFeeAsFiat"
        >
          <transition
            enter-active-class="transition transform ease-in duration-50"
            enter-from-class="-translate-y-1.5 opacity-0"
            enter-to-class="translate-y-0"
            leave-active-class="transition transform ease-in duration-50"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-1.5 opacity-0"
            mode="out-in"
          >
            <span v-if="canDisplayFeeAsFiat && displayFeeAsFiat">{{ totalPrice }} of</span>
            <span v-else class="break-all">{{ parseTokenAmount(feeAmount, feeToken.decimals) }}</span>
          </transition>
          &nbsp;
          <span class="font-medium">{{ feeToken.symbol }}</span>
          &nbsp;
          <TokenImage class="h-5 w-5" v-bind="feeToken" />
        </component>
        <template v-else>{{ $t("transaction.unknownFee") }}</template>
      </div>
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Token } from "@/types";
import type { BigNumberish } from "ethers";

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  feeAmount: {
    type: String as PropType<BigNumberish>,
  },
  feeToken: {
    type: Object as PropType<Token>,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const displayFeeAsFiat = ref(true);
const canDisplayFeeAsFiat = computed(() => !!props.feeToken?.price);

const totalPrice = computed(() => {
  if (typeof props.feeToken?.price !== "number" || !props.feeAmount) {
    return "";
  }
  return formatTokenPrice(props.feeAmount, props.feeToken.decimals, props.feeToken.price);
});
</script>

<style lang="scss" scoped>
.fee-details-container {
  @apply flex items-center whitespace-nowrap text-neutral-700 dark:text-neutral-500;
}
</style>
