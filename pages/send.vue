<template>
  <TransferView type="transfer">
    <template #title>
      <PageTitle :fallback-route="{ name: 'send-methods' }">Send to another address</PageTitle>
    </template>
  </TransferView>
</template>

<script lang="ts" setup>
import TransferView from "@/views/transactions/Transfer.vue";
</script>

<style lang="scss" scoped></style>
