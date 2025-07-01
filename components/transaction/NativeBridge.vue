<template>
  <div>
    <CommonAlert variant="warning" size="sm" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>
        Only {{ eraNetwork.nativeCurrency!.symbol }} is allowed for bridging {{ type === "withdraw" ? "from" : "to" }}
        {{ eraNetwork.name }}.
      </p>
    </CommonAlert>
  </div>
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

import type { ZkSyncNetwork } from "@/data/networks"; // Adjust the import path as needed

defineProps<{
  eraNetwork: ZkSyncNetwork;
  type: "withdraw" | "deposit";
}>();
</script>
