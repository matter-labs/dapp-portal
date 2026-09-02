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
  <CommonButton v-if="!redirectURL" :to="{ name: 'on-ramp' }" class="mt-4" variant="light" @click="reload"
    >Add more funds</CommonButton
  >
  <template v-else>
    <CommonButton class="mt-4" variant="light" @click="goToRedirect">
      Redirecting you back in 3 seconds.<br />
      Click to go back to {{ redirectURL.hostname }}
    </CommonButton>
  </template>
</template>

<script lang="ts" setup>
import type { BigNumberish } from "ethers";
import type { StepExtended } from "zksync-easy-onramp";

const REDIRECT_DELAY = 3000;

const route = useRoute();
// The redirect target comes from a public query parameter, so it is only used once validated
const redirectURL = parseOnRampRedirectUrl(route.query.redirect);
if (route.query.redirect && !redirectURL) {
  logger.warn("Ignoring on-ramp redirect: only absolute https URLs without credentials are allowed");
}

const { order } = storeToRefs(useOrderProcessingStore());

const chainIcon = ref("/img/era.svg");

const { selectedToken } = storeToRefs(useOnRampStore());

const finalValue = computed(() => {
  const swapPurchase = order.value!.steps.length > 1;
  if (swapPurchase) {
    const lastStep: StepExtended = order.value!.steps[1];
    return formatTokenBalance(lastStep!.execution!.toAmount as BigNumberish, selectedToken.value!.decimals);
  } else {
    const lastStep: StepExtended = order.value!.steps[0];
    return [lastStep!.execution!.process[1].toAmount.toFixed(6)];
  }
});
const tokenSymbol = computed(() => selectedToken.value!.symbol);
const tokenIconUrl = computed(() => selectedToken.value!.iconUrl);

const reload = () => {
  window.location.reload();
};

const goToRedirect = () => {
  if (!redirectURL) return;
  window.location.assign(redirectURL.href);
};

let redirectTimeout: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  if (redirectURL) {
    redirectTimeout = setTimeout(goToRedirect, REDIRECT_DELAY);
  }
});
onBeforeUnmount(() => {
  clearTimeout(redirectTimeout);
});
</script>
