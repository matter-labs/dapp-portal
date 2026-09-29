<template>
  <CommonButtonLineWithImg :as="as">
    <template #image>
      <TokenImage :symbol="symbol" :address="address" :icon-url="iconUrl" />
    </template>
    <template #default>
      <CommonButtonLineBodyInfo class="text-left">
        <template #label>
          <div v-if="isUnverified" class="flex items-center gap-2">
            <div class="truncate">{{ symbol }}</div>
            <span class="token-unverified-badge">
              <ExclamationTriangleIcon class="h-4 w-4" aria-hidden="true" />
              Unverified
            </span>
          </div>
          <div v-else class="truncate">{{ symbol }}</div>
        </template>
        <template v-if="name || isUnverified" #underline>
          <div v-if="isUnverified" class="truncate" :title="address">
            {{ shortenAddress(address) }}<template v-if="name"> · {{ name }}</template>
          </div>
          <div v-else class="truncate">{{ name }}</div>
        </template>
      </CommonButtonLineBodyInfo>
    </template>
    <template #right>
      <slot name="right" />
    </template>
  </CommonButtonLineWithImg>
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

import type { TokenPrice } from "@/types";

defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  address: {
    type: String,
    required: true,
  },
  decimals: {
    type: Number,
    required: true,
  },
  iconUrl: {
    type: String,
  },
  price: {
    type: [String, Number] as PropType<TokenPrice>,
  },
  isUnverified: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.token-unverified-badge {
  @apply flex flex-none items-center gap-1 rounded-lg bg-warning-400 px-2 text-sm text-black;
}
</style>
