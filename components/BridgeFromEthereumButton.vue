<template>
  <CommonCardWithLineButtons
    class="bridge-from-ethereum-button"
    :class="{ 'animated-button': displayTotalTokens }"
    variant="primary"
  >
    <DestinationItem
      :icon-url="destinations.ethereum.iconUrl"
      as="RouterLink"
      :to="{ name: 'bridge' }"
      variant="primary"
    >
      <template #label>
        <span class="text-white">Bridge from {{ eraNetwork.l1Network?.name }}</span>
      </template>
      <template #underline>
        <span v-if="!displayTotalTokens || !balance" class="text-white">
          Receive tokens from your {{ eraNetwork.l1Network?.name }} account
        </span>
        <span v-else class="text-white">
          You have {{ balance.length }} token{{ balance.length > 1 ? "s" : "" }} worth
          {{ formatPricePretty(totalTokenBalance) }} that you can receive from {{ eraNetwork.l1Network?.name }}
        </span>
      </template>
    </DestinationItem>
  </CommonCardWithLineButtons>
</template>

<script lang="ts" setup>
const zkSyncEthereumBalanceStore = useZkSyncEthereumBalanceStore();
const { destinations } = storeToRefs(useDestinationsStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const { balance } = storeToRefs(zkSyncEthereumBalanceStore);

const totalTokenBalance = computed(() => {
  if (!balance.value) {
    return 0;
  }
  return calculateTotalTokensPrice(balance.value);
});

const displayTotalTokens = computed(() => {
  if (totalTokenBalance.value < 5) {
    return false;
  }
  return true;
});

onMounted(() => {
  if (eraNetwork.value.blockExplorerApi) {
    zkSyncEthereumBalanceStore.requestBalance();
  }
});
</script>

<style lang="scss" scoped>
.bridge-from-ethereum-button {
  @apply relative isolate;
  &.animated-button::before {
    animation: button-blink-animation 1s ease forwards;
    @keyframes button-blink-animation {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(1.1, 1.4);
      }
    }
  }
  &::before {
    content: "";
    @apply absolute inset-0 z-[-1] h-full w-full rounded-3xl bg-primary-400;
  }
}
</style>
