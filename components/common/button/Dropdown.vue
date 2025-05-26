<template>
  <CommonButton class="dropdown-button">
    <div v-if="$slots['left-icon']" class="left-icon-container">
      <slot name="left-icon" />
    </div>
    <slot />
    <div v-if="!noChevron || $slots['right-icon']" class="right-icon-container">
      <slot name="right-icon">
        <ChevronDownIcon v-if="!noChevron" class="default-dropdown-icon" :class="{ toggled }" aria-hidden="true" />
      </slot>
    </div>
  </CommonButton>
</template>

<script lang="ts" setup>
import { ChevronDownIcon } from "@heroicons/vue/24/outline";

defineProps({
  toggled: {
    type: Boolean,
    default: false,
  },
  noChevron: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.dropdown-button {
  @apply flex items-center justify-start gap-2;

  .left-icon-container {
    @apply h-6 w-6 flex-shrink-0;
  }
  .right-icon-container {
    @apply ml-auto h-5 w-5 flex-shrink-0;

    .default-dropdown-icon {
      @apply transition;
      &.toggled {
        @apply rotate-180;
      }
    }
  }
}
</style>

<style lang="scss">
.dropdown-button {
  .left-icon-container,
  .right-icon-container {
    img,
    svg {
      @apply h-full w-full;
    }
  }
}
</style>
