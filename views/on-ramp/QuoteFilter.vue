<template>
  <div class="flex flex-wrap items-center justify-start gap-2">
    <span class="button" :class="{ selected: selectedFilters.length === 0 }" @click="applyFilter('all')"> All </span>
    <span
      v-for="(button, key) in buttons"
      :key="button"
      class="button"
      :class="{
        selected: selectedFilters.some((filter: any) => groupedFilters[key].includes(filter)),
      }"
      @click="applyFilter(key)"
    >
      {{ button }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { PaymentMethod } from "zksync-easy-onramp";

const buttons = {
  credit: "Credit Card",
  debit: "Debit Card",
  transfer: "Bank Transfer",
};
const groupedFilters = ref<{ [k in string]: PaymentMethod[] }>({
  credit: ["apple_pay_credit", "google_pay_credit", "credit_card"],
  debit: ["apple_pay_debit", "google_pay_debit", "debit_card"],
  transfer: ["wire", "ach", "koywe", "sepa", "pix"],
});
const { quoteFilter: selectedFilters } = storeToRefs(useQuotesStore());
const applyFilter = (filterKey: string) => {
  if (filterKey === "all") {
    selectedFilters.value = [];
    return;
  }

  if (groupedFilters.value[filterKey].some((filter) => selectedFilters.value.includes(filter as PaymentMethod))) {
    selectedFilters.value = selectedFilters.value.filter(
      (filter) => !groupedFilters.value[filterKey].includes(filter as PaymentMethod)
    );
  } else {
    selectedFilters.value = [
      ...selectedFilters.value,
      ...groupedFilters.value[filterKey].flatMap((filter) => filter as PaymentMethod),
    ];
  }
};
</script>

<style lang="scss" scoped>
.button {
  @apply inline-block w-auto cursor-pointer rounded-full bg-neutral-50 px-2.5 py-0.5 text-xs dark:bg-neutral-900 dark:hover:bg-neutral-800;

  &.selected {
    @apply bg-neutral-700 text-neutral-50 dark:bg-white dark:text-black;
  }
}
</style>
