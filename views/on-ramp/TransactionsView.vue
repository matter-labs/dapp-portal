<template>
  <div class="mb-2 flex items-center gap-2">
    <CommonButtonLabel as="button" variant="light" @click="setStep('buy')">
      <div
        class="flex items-center rounded-2xl bg-neutral-200 p-3 hover:bg-neutral-300 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-500"
      >
        <ChevronLeftIcon class="h-6 w-6" />
      </div>
    </CommonButtonLabel>
    <h3 class="grow text-lg">Transactions</h3>
  </div>
  <template v-if="routes">
    <div v-for="route in routes" :key="route.id" class="my-1.5">
      <div
        class="flex cursor-pointer items-center gap-4 rounded-2xl bg-neutral-200 px-2 py-4 hover:border-gray-500 hover:bg-neutral-300 dark:bg-neutral-900 dark:hover:bg-neutral-700/80"
        @click="selectRoute(route)"
      >
        <div>
          <TokenImage
            :chain-icon="chainIcon"
            :symbol="route.receive.token.symbol"
            :icon-url="route.receive.token.iconUrl"
            class="h-10 w-10"
          />
        </div>
        <div class="flex grow flex-col">
          <div class="flex items-center gap-2">
            <div class="flex items-center">
              <span class="text-base">{{ payAmount(route) }}</span>
              <span class="px-1"><ArrowRightIcon class="h-4 w-4" /></span>
              <span class="text-base" :title="receiveAmount(route)[1]"
                >{{ receiveAmount(route)[0] }} {{ route.receive.token.symbol }}</span
              >
            </div>
          </div>
          <div class="text-pretty text-sm text-neutral-600 dark:text-neutral-400">
            {{ lastMessage(route) }}
          </div>
        </div>
        <div>
          <ChevronRightIcon class="h-6 w-6 text-gray-700 dark:text-white" />
        </div>
      </div>
    </div>
  </template>
</template>

<script lang="ts" setup>
import { ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from "@heroicons/vue/20/solid";

import type { Route } from "zksync-easy-onramp";

const chainIcon = "/img/era.svg";

const { routes } = useRoutesStore();

const lastMessage = (route: Route) => {
  const executedSteps = route.steps.filter((step) => step.execution && step.execution.status !== "DONE");
  const lastExecutedStep = executedSteps[executedSteps.length - 1];
  const lastProcess = lastExecutedStep.execution?.process.filter((process) => process.status !== "DONE");
  if (!lastProcess[lastProcess.length - 1]) {
    return "Transaction process is not completed.";
  }
  return lastProcess[lastProcess.length - 1].message;
};

const payAmount = (route: Route) => {
  return formatFiat(route.pay.fiatAmount ?? 0, route.pay.currency);
};

const receiveAmount = (route: Route) => {
  return formatTokenBalance(route.receive.amountUnits ?? 0, route.receive.token.decimals);
};

const { setStep } = useOnRampStore();
const { selectQuote } = useOrderProcessingStore();
function selectRoute(route: Route) {
  selectQuote(route);
  setStep("processing");
}
</script>
