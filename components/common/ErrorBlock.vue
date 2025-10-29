<template>
  <div class="error-block-container">
    <FaceFrownIcon class="error-block-icon" aria-hidden="true" />
    <slot>{{ $t("errors.unexpectedError") }}</slot>
    <CommonButton v-if="retryButton" class="ml-3" variant="error" @click="emit('try-again')">{{
      $t("common.tryAgain")
    }}</CommonButton>
  </div>
</template>

<script lang="ts" setup>
import { FaceFrownIcon } from "@heroicons/vue/24/outline";

defineProps({
  retryButton: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits<{
  (eventName: "try-again"): void;
}>();
</script>

<style lang="scss" scoped>
.error-block-container {
  @apply grid w-full grid-cols-[max-content_1fr_max-content] items-center rounded-3xl border border-dashed border-red-500 p-2 text-red-500;

  .error-block-icon {
    @apply mr-3 block h-7 w-7;
  }
  .error-block-text-container {
    @apply line-clamp-6 whitespace-pre-line break-words;
    word-break: break-word;
  }
}
</style>
