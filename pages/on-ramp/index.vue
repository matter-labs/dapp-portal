<template>
  <PageTitle>Buy crypto</PageTitle>
  <Transition v-bind="TransitionOpacity()" class="relative" as="div">
    <ActiveTransactionsAlert v-if="step === 'buy'" class="absolute" />
  </Transition>
  <Transition tag="div" class="relative mt-5 flex flex-wrap items-center justify-center">
    <CompletedView v-if="step === 'complete'" />
    <TransactionsView v-else-if="step === 'transactions'" />
    <div v-else-if="step === 'buy' || step === 'quotes' || step === 'processing'">
      <FormView v-model="fiatAmount" />
      <MiddlePanel v-model="middlePanelView" />
      <div class="w-full">
        <svg class="m-auto stroke-gray-500" width="2px" height="40px" xmlns="http://www.w3.org/2000/svg">
          <line x1="0" y1="0" x2="0" y2="40" stroke-width="4" stroke-dasharray="7, 9" stroke-linecap="square" />
        </svg>
      </div>
      <CommonContentBlock>
        <div class="flex flex-col gap-4">
          <div>
            <span class="font-bold">You'll receive</span>
          </div>
          <div class="flex items-center justify-stretch gap-4">
            <SelectTokenModal @select-token="selectTokenUpdate" />
          </div>
        </div>
      </CommonContentBlock>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";

import ActiveTransactionsAlert from "@/views/on-ramp/ActiveTransactionsAlert.vue";
import CompletedView from "@/views/on-ramp/CompletedView.vue";
import FormView from "@/views/on-ramp/FormView.vue";
import MiddlePanel from "@/views/on-ramp/MiddlePanel.vue";
import SelectTokenModal from "@/views/on-ramp/SelectTokenModal.vue";
import TransactionsView from "@/views/on-ramp/TransactionsView.vue";

import type { Address } from "viem";
import type { ConfigResponse } from "zksync-easy-onramp";

const middlePanelView = ref("initial");

const { step, middlePanelHeight } = storeToRefs(useOnRampStore());
const { account, isConnected } = storeToRefs(useOnboardStore());
const { quotes } = storeToRefs(useQuotesStore());
onMounted(() => {
  quotes.value = null;
});
watch(step, () => {
  if (step.value === "buy") {
    fiatAmount.value = "";
    quotes.value = null;
    middlePanelView.value = "initial";
    middlePanelHeight.value = 0;
  }
});

const fiatAmount = ref("");
const token = ref<ConfigResponse["tokens"][0] | null>(null);

const selectTokenUpdate = (selectedToken: ConfigResponse["tokens"][0]) => {
  token.value = selectedToken;
};

const { fetchQuotes } = useOnRampStore();
watchDebounced(
  fiatAmount,
  (value) => {
    if (!isConnected.value) {
      middlePanelView.value = "connect";
      return;
    }

    if (value && token.value) {
      fetch();
    }
  },
  { debounce: 750, maxWait: 5000 }
);
watchDebounced(token, (value) => {
  if (!isConnected.value) {
    middlePanelView.value = "connect";
    return;
  }

  if (fiatAmount.value && value) {
    fetch();
  }
});

watch(isConnected, () => {
  if (isConnected.value && !!fiatAmount.value && +fiatAmount.value > 0 && token.value) {
    fetch();
  }
});

const fetch = () => {
  fetchQuotes({
    fiatAmount: +fiatAmount.value,
    toToken: token.value!.address as Address,
    chainId: 324,
    toAddress: account.value.address!,
  });
};

onMounted(() => {
  step.value = "buy";
  middlePanelHeight.value = 0;
});
</script>
