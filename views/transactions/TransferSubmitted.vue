<template>
  <div>
    <h1 class="h1 mt-block-gap-1/2 text-center">
      {{ transaction.info.completed ? "Transaction completed" : "Transaction submitted" }}
    </h1>
    <CommonHeightTransition :opened="!transaction.info.completed">
      <p class="mb-4 text-center">
        Your funds will be available at the
        <a
          v-if="blockExplorerUrl"
          :href="buildExplorerUrl(blockExplorerUrl, transaction!.to.address)"
          target="_blank"
          class="font-medium underline underline-offset-2"
          >destination address</a
        >
        <span v-else>destination address</span>
        after the transaction is committed on the
        <span class="font-medium">{{ transaction.from.destination.label }}</span
        >. You are free to close this page.
      </p>
    </CommonHeightTransition>
    <TransactionProgress
      :from-address="transaction.from.address"
      :from-destination="transaction.from.destination"
      :to-address="transaction.to.address"
      :to-destination="transaction.to.destination"
      :explorer-link="blockExplorerUrl"
      :transaction-hash="transaction.transactionHash"
      :token="transaction.token"
      :completed="transaction.info.completed"
      :failed="transaction.info.failed"
    />

    <CommonButton as="RouterLink" :to="{ name: 'assets' }" class="mt-block-gap" variant="primary">
      Go to Assets page
    </CommonButton>
    <CommonButton
      size="sm"
      :as="makeAnotherTransaction ? undefined : 'RouterLink'"
      :to="{ name: 'send' }"
      class="mx-auto mt-block-gap w-max"
      @click="makeAnotherTransaction && makeAnotherTransaction()"
    >
      Make another transaction
    </CommonButton>
  </div>
</template>

<script lang="ts" setup>
defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
  makeAnotherTransaction: {
    type: Function as PropType<() => void>,
    required: false,
  },
});

const { blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());
</script>
