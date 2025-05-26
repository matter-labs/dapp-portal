<template>
  <CommonButtonLine :as="as" class="line-button-with-img">
    <div class="line-button-with-img-image">
      <slot name="image" />
    </div>
    <div class="line-button-with-img-body">
      <slot />
    </div>
    <div v-if="$slots.right" class="line-button-with-img-right">
      <slot name="right" />
    </div>
    <component :is="icon" v-if="icon" class="line-button-with-img-icon" aria-hidden="true" />
    <CommonContentLoader v-else-if="iconLoading" :length="0" class="line-button-with-img-icon-loading" />
  </CommonButtonLine>
</template>

<script lang="ts" setup>
defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
  },
  icon: {
    type: [Object, Function] as PropType<Component>,
  },
  iconLoading: {
    type: Boolean,
    default: false,
  },
});
</script>

<style lang="scss" scoped>
.line-button-with-img {
  @apply flex items-center gap-4;

  .line-button-with-img-image {
    @apply my-[1.5px] aspect-square h-auto w-12 flex-none self-start;
  }
  .line-button-with-img-body {
    @apply w-full overflow-hidden;
  }
  .line-button-with-img-right {
    @apply w-max;
  }
  .line-button-with-img-icon {
    @apply ml-1 mr-2 h-5 w-5 flex-none text-neutral-500 dark:text-neutral-400;
  }
  .line-button-with-img-icon-loading {
    @apply mx-1 h-7 w-7 flex-none rounded-full;
  }
}
</style>
