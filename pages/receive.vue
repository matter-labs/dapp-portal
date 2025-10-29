<template>
  <div>
    <PageTitle :fallback-route="{ name: 'receive-methods' }">{{ $t("wallet.walletAddress") }}</PageTitle>
    <ConnectWalletBlock v-if="!isConnected">{{ $t("common.connectWallet") }}</ConnectWalletBlock>
    <Receive v-else :address="address" :destination="destinations.era" />
  </div>
</template>

<script lang="ts" setup>
import Receive from "@/views/transactions/Receive.vue";

const { account, isConnected } = storeToRefs(useOnboardStore());
const { destinations } = storeToRefs(useDestinationsStore());

const address = computed(() => account.value.address || "");
</script>
