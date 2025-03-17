<template>
  <div class="inline-block h-6 w-6 align-middle">
    <ClockIcon v-if="status === 'PENDING'" class="text-orange-500" />
    <ArrowLongRightIcon v-else-if="status === 'ACTION_REQUIRED'" class="animate-pulse text-neutral-500" />
    <ExclamationCircleIcon v-else-if="status === 'CANCELLED' || status === 'FAILED'" class="text-red-500" />
    <CheckCircleIcon v-else-if="status === 'DONE'" class="text-green-700" />
    <EllipsisHorizontalIcon v-else class="text-gray-500" />
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowLongRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/vue/24/outline";

import type { ProcessStatus } from "zksync-easy-onramp";

defineProps<{
  status: ProcessStatus;
}>();
</script>
