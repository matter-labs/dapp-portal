<template>
  <div class="flex items-center gap-2">
    <h3 class="grow text-lg">Transactions</h3>
    <CommonButtonLabel as="button" variant="light" @click="setStep('buy')">
      <div class="flex items-center">
        <ChevronLeftIcon class="h-4 w-4" />
        Back
      </div>
    </CommonButtonLabel>
  </div>
  <template v-if="routes">
    <div v-for="route in routes" :key="route.id" class="my-2">
      <div
        class="flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-400 p-2 hover:border-gray-500 hover:bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700/80"
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
              <span>{{ payAmount(route) }}</span>
              <span class="px-1"><ArrowRightIcon class="h-4 w-4" /></span>
              <span :title="receiveAmount(route)[1]"
                >{{ receiveAmount(route)[0] }} {{ route.receive.token.symbol }}</span
              >
            </div>
          </div>
          <div class="text-pretty text-[10px]/[12px]">
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
  const executedSteps = route.steps.filter((step) => step.execution);
  const lastExecutedStep = executedSteps[executedSteps.length - 1];
  const lastProcess = lastExecutedStep.execution?.process.filter((process) => process.status !== "DONE");
  if (!lastProcess) {
    return "Transaction is not completed.";
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
