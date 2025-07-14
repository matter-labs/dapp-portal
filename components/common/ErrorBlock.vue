<template>
  <div class="error-block-container">
    <FaceFrownIcon class="error-block-icon" aria-hidden="true" />
    <div :class="showCopyButton ? 'hidden' : 'error-block-text-container'">
      <slot>Unexpected error</slot>
    </div>
    <p :class="showCopyButton ? 'error-block-text-container' : 'hidden'">
      Transaction failed. Please try again or copy the details of the error text.
    </p>
    <span class="flex flex-col items-end justify-center gap-2">
      <CommonButton v-if="retryButton" class="ml-3" variant="error" @click="emit('try-again')">Try again</CommonButton>
      <CommonButton
        v-if="showCopyButton"
        class="ml-3 text-sm"
        size="sm"
        variant="error"
        @click="emit('copy-message')"
        >{{ copied ? "Copied!" : "Copy error text" }}</CommonButton
      >
    </span>
  </div>
</template>

<script lang="ts" setup>
import { FaceFrownIcon } from "@heroicons/vue/24/outline";

defineProps({
  retryButton: {
    type: Boolean,
    default: true,
  },
  showCopyButton: {
    type: Boolean,
    default: false,
  },
  copied: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "try-again"): void;
  (eventName: "copy-message"): void;
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
