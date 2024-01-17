<template>
  <div v-if="transaction">
    <DepositSubmitted v-if="transaction.type === 'deposit'" :transaction="transaction" />
    <TransferSubmitted v-else :transaction="transaction" />
  </div>
  <div v-else>
    <h1 class="h1 mt-block-gap-1/2 text-center">Transaction not found</h1>
    <p class="mb-block-gap text-center">
      The transaction you are looking for is not found. It is possible you submitted it from another browser or device.
    </p>
    <CommonButton as="RouterLink" :to="{ name: 'assets' }" class="mt-block-gap" variant="primary">
      Go to Assets page
    </CommonButton>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import { storeToRefs } from "pinia";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";

import { useRoute } from "#app";
import { useZkSyncTransactionStatusStore } from "@/store/zksync/transactionStatus";
import DepositSubmitted from "@/views/transactions/DepositSubmitted.vue";
import TransferSubmitted from "@/views/transactions/TransferSubmitted.vue";

const route = useRoute();

const transactionStatusStore = useZkSyncTransactionStatusStore();
const { savedTransactions } = storeToRefs(transactionStatusStore);

const completedTransaction = ref<TransactionInfo | null>(null);
const savedTransaction = computed(() => {
  return savedTransactions.value.find((_transaction) => _transaction.transactionHash === route.params.hash);
});
const transaction = computed(() => {
  return completedTransaction.value || savedTransaction.value;
});

watch(
  () => route.params.hash,
  () => {
    completedTransaction.value = null;
    if (!savedTransaction.value) return;

    transactionStatusStore.waitForCompletion(savedTransaction.value).then((_completedTransaction) => {
      if (route.params.hash === _completedTransaction.transactionHash) {
        completedTransaction.value = _completedTransaction;
      }
    });
  },
  { immediate: true }
);
</script>