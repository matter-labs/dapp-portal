<template>
  <input v-model="inputted" class="input-line" :class="{ 'has-error': hasError }" />
</template>

<script lang="ts" setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  hasError: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "update:modelValue", value: string): void;
}>();

const inputted = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>

<style lang="scss" scoped>
.input-line {
  @apply block w-full overflow-hidden rounded-none border-b-2 bg-transparent leading-snug outline-none transition placeholder:text-neutral-300 dark:placeholder:text-neutral-700;
  @apply border-neutral-200 dark:border-neutral-800;
  &:not(.has-error) {
    @apply hover:border-neutral-300 focus:border-neutral-950;
    @apply dark:hover:border-neutral-600 dark:focus:border-white;
  }
  &.has-error {
    @apply border-error-300;
  }
}
</style>
