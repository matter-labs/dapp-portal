<template>
  <label class="checkbox-with-text" tabindex="0" @keyup.enter="checked = !checked">
    <div class="relative">
      <input v-model="checked" type="checkbox" class="sr-only" tabindex="-1" />
      <div class="checkbox-input" :class="{ checked }" :data-testid="dataTestid">
        <svg v-if="checked" class="checkbox-icon" viewBox="0 0 20 20" fill="currentColor">
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>
    <div class="ml-4">
      <slot />
    </div>
  </label>
</template>

<script lang="ts" setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  dataTestid: {
    type: String,
    default: "",
  },
});
const emit = defineEmits<{
  (eventName: "update:modelValue", value: boolean): void;
}>();

const checked = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});
</script>

<style lang="scss" scoped>
.checkbox-with-text {
  @apply flex w-full cursor-pointer items-center justify-center outline-none ring-0;

  .checkbox-input {
    @apply flex h-6 w-6 items-center justify-center rounded-lg border border-neutral-400 dark:bg-neutral-800;
    &.checked {
      @apply border-primary-400 bg-primary-400;
    }

    .checkbox-icon {
      @apply h-5 w-5 text-white;
    }
  }
}
</style>
