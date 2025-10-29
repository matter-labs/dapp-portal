<template>
  <CommonHeightTransition :opened="!!withdrawalsAvailableForClaiming.length">
    <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>{{ $t("withdrawals.availableForClaim", { network: eraNetwork.l1Network?.name }) }}</p>
      <CommonButton as="RouterLink" :to="{ name: 'transfers' }" variant="primary">
        <span class="whitespace-nowrap">{{ $t("withdrawals.seeWithdrawals") }}</span>
      </CommonButton>
    </CommonAlert>
  </CommonHeightTransition>
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const { withdrawalsAvailableForClaiming } = storeToRefs(useZkSyncWithdrawalsStore());
</script>
