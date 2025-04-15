<template>
  <CommonContentBlock>
    <div class="-mt-3 flex w-full flex-col gap-6 sm:flex-row">
      <div class="flex w-full flex-col sm:w-1/2">
        <span class="mb-2 font-bold">You pay (USD)</span>
        <template v-if="step === 'processing'">
          <div v-if="order" class="flex items-center justify-stretch gap-4">
            <span class="py-4 text-3xl">{{ formatFiat(order.pay.fiatAmount, order.pay.currency) }}</span>
            <!-- <div class="py-4">
              <span class="inline-block align-middle text-lg leading-6 text-gray-700 dark:text-white">{{
                order.pay.currency
              }}</span>
            </div> -->
          </div>
        </template>
        <template v-else>
          <div class="flex gap-2">
            <input
              v-model="fiatAmount"
              type="string"
              placeholder="100"
              class="w-full grow rounded-3xl p-2 text-4xl dark:bg-neutral-800 sm:p-5"
            />
            <!-- <div class="flex items-center rounded-3xl bg-gray-300 p-5 py-4 dark:bg-neutral-950">
              <span class="inline-block align-middle text-lg leading-6 text-gray-700 dark:text-white">USD</span>
            </div> -->
          </div>
          <div v-if="isNaN(+fiatAmount)">Input is not a valid number.</div>
          <div v-if="+fiatAmount <= 30" class="pl-2 text-xs text-neutral-300">
            Add $30+ to unlock more provider options.
          </div>
        </template>
      </div>
      <div class="flex w-full flex-col sm:w-1/2">
        <span class="mb-2 font-bold">You'll receive</span>
        <template v-if="step === 'processing'">
          <div class="flex gap-4 p-3">
            <TokenImage
              :chain-icon="chainIcon"
              :symbol="processingToken!.symbol"
              :icon-url="processingToken!.iconUrl"
              class="h-11 w-11"
            />
            <div class="flex flex-col justify-center">
              <div class="dark:text-gray-100">{{ processingToken!.symbol }} on {{ networkName }}</div>
              <div class="text-sm">{{ processingToken!.name }}</div>
            </div>
          </div>
        </template>
        <template v-else>
          <SelectTokenModal @select-token="selectTokenUpdate" />
        </template>
      </div>
    </div>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
import { chainList } from "@/data/networks";
import SelectTokenModal from "@/views/on-ramp/SelectTokenModal.vue";

import type { ConfigResponse } from "zksync-easy-onramp";

const chainIcon = ref("/img/era.svg");

const { step } = storeToRefs(useOnRampStore());
const fiatAmount = defineModel<string>({ required: true });

const { order } = storeToRefs(useOrderProcessingStore());
const processingToken = computed(() => {
  if (order.value) {
    return order.value.receive.token;
  }
  return null;
});

const emit = defineEmits(["selectToken"]);
const token = ref<ConfigResponse["tokens"][0] | null>(null);
const selectTokenUpdate = (selectedToken: ConfigResponse["tokens"][0]) => {
  token.value = selectedToken;
  emit("selectToken", token.value);
};

const { onRampChainId } = useOnRampStore();
const networkName = computed(() => {
  if (onRampChainId === 1) {
    return "Ethereum";
  }
  return chainList.find((chain) => chain.id === onRampChainId)?.name;
});
</script>
