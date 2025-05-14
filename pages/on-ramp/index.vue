<template>
  <PageTitle>Buy crypto</PageTitle>
  <CommonHeightTransition :opened="step === 'buy' || step === 'quotes'">
    <ActiveTransactionsAlert class="mb-5" />
  </CommonHeightTransition>
  <Transition tag="div" class="relative flex flex-wrap items-center justify-center">
    <CompletedView v-if="step === 'complete'" />
    <TransactionsView v-else-if="step === 'transactions'" />
    <div v-else-if="step === 'buy' || step === 'quotes' || step === 'processing'" class="isolate">
      <FormView v-model="fiatAmount" @select-token="selectTokenUpdate" />
      <MiddlePanel v-model="middlePanelView" class="-z-[1] mt-6" />
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { watchDebounced } from "@vueuse/core";

import ActiveTransactionsAlert from "@/views/on-ramp/ActiveTransactionsAlert.vue";
import CompletedView from "@/views/on-ramp/CompletedView.vue";
import FormView from "@/views/on-ramp/FormView.vue";
import MiddlePanel from "@/views/on-ramp/MiddlePanel.vue";
// import SelectTokenModal from "@/views/on-ramp/SelectTokenModal.vue";
import TransactionsView from "@/views/on-ramp/TransactionsView.vue";

import type { Address } from "viem";
import type { ConfigResponse } from "zksync-easy-onramp";

const DEFAULT_FIAT_AMOUNT = "100";

const { step } = storeToRefs(useOnRampStore());
const { reset } = useOnRampStore();
const { account, isConnected } = storeToRefs(useOnboardStore());
const { reset: resetQuotes } = useQuotesStore();
onMounted(() => {
  reset();
  resetQuotes();
});

const middlePanelView = ref("initial");
watch(isConnected, (connected) => {
  if (!connected) {
    middlePanelView.value = "connect";
  }
});

watch(step, () => {
  if (step.value === "buy") {
    fiatAmount.value = DEFAULT_FIAT_AMOUNT;
    resetQuotes();
    middlePanelView.value = "initial";
    fetch();
  }
});

const fiatAmount = ref(DEFAULT_FIAT_AMOUNT);
const token = ref<ConfigResponse["tokens"][0] | null>(null);

const selectTokenUpdate = (selectedToken: ConfigResponse["tokens"][0]) => {
  token.value = selectedToken;
};

watchDebounced(
  [fiatAmount, token, computed(() => account.value.address)],
  () => {
    fetch();
  },
  { debounce: 750, maxWait: 5000, immediate: true }
);

const { fetchQuotes } = useOnRampStore();
const { onRampChainId } = useOnRampStore();
const fetch = () => {
  if (!isConnected.value || !token.value || !fiatAmount.value || +fiatAmount.value <= 0 || isNaN(+fiatAmount.value))
    return;
  fetchQuotes({
    fiatAmount: +fiatAmount.value,
    toToken: token.value!.address as Address,
    chainId: onRampChainId,
    toAddress: account.value.address!,
  });
};
</script>
