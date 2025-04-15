<template>
  <div
    class="cursor-pointer rounded-xl border border-gray-200 bg-gray-100 hover:bg-gray-200/50 dark:border-neutral-800/70 dark:bg-neutral-900 dark:hover:bg-neutral-800/80"
    @click="runQuote"
  >
    <div class="quote-grid grid gap-2 p-3">
      <div class="amount-section">
        <div>
          <div>
            <span class="font-bold" :title="balance[1]">{{ balance[0] }} {{ quote.receive.token.symbol }}</span>
            <span class="text-xs text-gray-600 dark:text-gray-400">
              &nbsp;~{{ formatFiat(quote.receive.amountFiat, quote.pay.currency) }}
            </span>
          </div>
        </div>
      </div>
      <div class="details-section">
        <button
          type="button"
          class="p-0 text-sm text-neutral-500 underline hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-400"
          @click="toggleDetails"
        >
          {{ toggleOpen ? "Hide details" : "View details" }}
        </button>
      </div>
      <div class="provider-section flex">
        <!-- <div class="inline-block p-2">
          <img :src="quote.provider.iconUrl" class="h-8 w-8" />
        </div> -->
        <div class="payment-method inline-block text-right">
          <div class="mb-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
            {{ parsePaymentMethod(quote.method) }}
          </div>
          <div class="text-xs text-gray-700 dark:text-gray-300">via {{ provider.name }}</div>
          <!-- <div class="text-sm text-gray-600 dark:text-gray-300">{{ providerType }}</div> -->
        </div>
      </div>
    </div>
    <div v-if="toggleOpen" ref="quotePreview" class="flex flex-col gap-1 px-3 pb-3">
      <div class="text-sm">Fee: {{ formatFiat(quote.pay.totalFeeFiat, quote.pay.currency) }}</div>
      <div class="text-sm">Steps:</div>
      <div class="mt-0.5 flex flex-col gap-3">
        <StepDetail v-for="(step, index) in quote.steps" :key="index" :step="step" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { quoteToRoute, type PaymentMethod, type ProviderQuoteOption } from "zksync-easy-onramp";

import { useOrderProcessingStore } from "@/store/on-ramp/order-processing";
import StepDetail from "@/views/on-ramp/StepDetail.vue";

const props = defineProps<{
  quote: ProviderQuoteOption["paymentMethods"][0];
  provider: ProviderQuoteOption["provider"];
}>();

const balance = computed(() => {
  return formatTokenBalance(props.quote.receive.amountUnits, props.quote.receive.token.decimals);
});

function parsePaymentMethod(paymentMethodId: PaymentMethod) {
  switch (paymentMethodId) {
    case "credit_card":
      return "Credit card";
    case "apple_pay_credit":
      return "Apple Pay";
    case "google_pay_credit":
      return "Google Pay";
    case "google_pay_debit":
      return "Google Pay (Debit)";
    case "apple_pay_debit":
      return "Apple Pay (Debit)";
    case "debit_card":
      return "Debit card";
    case "wire":
      return "Wire transfer";
    case "sepa":
      return "SEPA transfer";
    case "pix":
      return "PIX";
    case "ach":
      return "ACH";
    case "koywe":
      return "Koywe";
    default:
      return paymentMethodId;
  }
}

/* const providerType = computed(() => {
  switch (props.quote.provider.type) {
    case "onramp":
      return "Fiat on-ramp";
    case "cex":
      return "Buy or deposit";
    default:
      return "Provider";
  }
}); */

const toggleOpen = ref(false);
function toggleDetails(e: Event) {
  e.stopPropagation();
  toggleOpen.value = !toggleOpen.value;
}

const quotePreview = ref<HTMLElement>();
const { middlePanelHeight } = storeToRefs(useOnRampStore());
const toggleHeight = ref(0);
watch(toggleOpen, () => {
  setTimeout(() => {
    if (toggleOpen.value) {
      toggleHeight.value = quotePreview.value?.offsetHeight || 0;
      middlePanelHeight.value += toggleHeight.value + 30;
    } else {
      middlePanelHeight.value -= toggleHeight.value + 30;
    }
  }, 0);
});

const { setStep } = useOnRampStore();
const { selectQuote } = useOrderProcessingStore();
function runQuote() {
  const routeToExecute = quoteToRoute("buy", props.quote, props.provider);
  selectQuote(routeToExecute);
  setStep("processing");
}
</script>

<style lang="scss" scoped>
.details-section {
  grid-area: details;
}

.amount-section {
  grid-area: amount;
}

.provider-section {
  grid-area: provider;
  justify-self: end;
}

.quote-grid {
  grid-template-areas:
    "amount provider"
    "details provider";
}

@media (max-width: 450px) {
  .quote-grid {
    grid-template-areas:
      "amount"
      "provider"
      "details";
  }

  .provider-section {
    justify-self: start;
  }

  .payment-method {
    text-align: left;

    & > div {
      display: inline;

      &:last-child {
        @apply pl-0.5;
      }
    }
  }
}
</style>
