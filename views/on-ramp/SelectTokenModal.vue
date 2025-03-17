<template>
  <TokenSelectModal
    v-model:opened="selectTokenModalOpened"
    v-model:token-address="selectedTokenAddress"
    :loading="configInProgress"
    :tokens="tokensList"
  />
  <CommonButtonDropdown
    class="w-full"
    variant="light"
    :toggled="selectTokenModalOpened"
    @click="selectTokenModalOpened = true"
  >
    <CommonContentLoader v-if="configInProgress" class="inline-block h-11 w-11 rounded-full" />
    <TokenImage
      v-else-if="selectedToken"
      :chain-icon="chainIcon"
      :symbol="selectedToken.symbol"
      :icon-url="selectedToken.iconUrl"
      class="h-11 w-11"
    />
    <div class="ml-2 flex flex-col gap-2 text-left text-gray-700 dark:text-gray-300">
      <template v-if="configInProgress">
        <CommonContentLoader class="h-3" :length="12" />
        <CommonContentLoader class="h-3" :length="4" />
      </template>
      <template v-else-if="selectedToken">
        <div class="dark:text-gray-100">{{ selectedToken.symbol }}</div>
        <div class="text-sm">{{ selectedToken.name }} on ZKsync</div>
      </template>
    </div>
  </CommonButtonDropdown>
</template>

<script lang="ts" setup>
import type { ConfigResponse } from "zksync-easy-onramp";

const emit = defineEmits(["selectToken"]);
const selectedTokenAddress = computed({
  get: () => selectedToken.value?.address,
  set: (value?: string) => setToken(value),
});
const setToken = (address?: string) => {
  selectedToken.value = tokensList.value.find((token) => token.address === address) ?? null;
  emit("selectToken", selectedToken.value);
};

const { config, configInProgress } = storeToRefs(useOnRampStore());
const tokensList = computed<ConfigResponse["tokens"]>(() =>
  config.value.tokens.filter((token) => token.chainId === 324)
);
const selectTokenModalOpened = ref(false);

const selectedToken = ref<ConfigResponse["tokens"][0] | null>(null);
watch(configInProgress, () => {
  if (!configInProgress.value) {
    selectedToken.value = tokensList.value.find((token) => token.symbol === "ETH") ?? null;
    emit("selectToken", selectedToken.value);
  }
});
const chainIcon = ref("/img/era.svg");
</script>
