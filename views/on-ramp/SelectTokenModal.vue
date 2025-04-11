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
    <div class="ml-2 flex flex-col text-left text-gray-700 dark:text-gray-300">
      <template v-if="configInProgress">
        <CommonContentLoader class="h-3" :length="12" />
        <CommonContentLoader class="h-3" :length="4" />
      </template>
      <template v-else-if="selectedToken">
        <div class="dark:text-gray-100">{{ selectedToken.symbol }} on {{ networkName }}</div>
        <div class="text-sm">{{ selectedToken.name }}</div>
      </template>
    </div>
  </CommonButtonDropdown>
</template>

<script lang="ts" setup>
import { chainList } from "@/data/networks";

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
const { onRampChainId } = useOnRampStore();
const tokensList = computed<ConfigResponse["tokens"]>(() =>
  config.value.tokens.filter((token) => token.chainId === onRampChainId)
);
const selectTokenModalOpened = ref(false);

const networkName = computed(() => {
  if (onRampChainId === 1) {
    return "Ethereum";
  }
  return chainList.find((chain) => chain.id === onRampChainId)?.name;
});

const selectedToken = ref<ConfigResponse["tokens"][0] | null>(null);
watch(configInProgress, () => {
  if (!configInProgress.value) {
    setToken(tokensList.value.find((token) => token.symbol === "ETH")?.address);
  }
});
const chainIcon = ref("/img/era.svg");

onMounted(() => {
  if (!configInProgress.value) {
    setToken(tokensList.value.find((token) => token.symbol === "ETH")?.address);
  }
});
</script>
