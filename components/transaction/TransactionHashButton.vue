<template>
  <div ref="el" class="w-max">
    <CommonButton
      v-if="!explorerUrl"
      size="xs"
      variant="light"
      :disabled="!transactionHash"
      class="transaction-hash-button"
      @click="copy()"
    >
      Copy tx hash
      <CommonSpinner
        v-if="!transactionHash"
        variant="text-color"
        class="transaction-hash-button-icon"
        aria-hidden="true"
      />
      <DocumentDuplicateIcon v-else class="transaction-hash-button-icon" aria-hidden="true" />
    </CommonButton>
    <template v-else>
      <CommonButton
        v-if="!transactionHash"
        size="xs"
        variant="light"
        target="_blank"
        disabled
        class="transaction-hash-button"
      >
        Explorer
        <CommonSpinner variant="text-color" class="transaction-hash-button-icon" aria-hidden="true" />
      </CommonButton>
      <CommonButton
        v-else
        size="xs"
        variant="light"
        as="a"
        :href="buildExplorerUrl(explorerUrl, transactionHash)"
        target="_blank"
        class="transaction-hash-button"
      >
        Explorer
        <ArrowTopRightOnSquareIcon class="transaction-hash-button-icon" aria-hidden="true" />
      </CommonButton>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon, DocumentDuplicateIcon } from "@heroicons/vue/24/outline";
import { useTippy } from "vue-tippy";

const props = defineProps({
  explorerUrl: {
    type: String,
  },
  transactionHash: {
    type: String,
  },
});

const { copy, copied } = useCopy(computed(() => props.transactionHash || ""));
const el = ref<HTMLButtonElement | undefined>();
const a = useTippy(el, {
  content: "Transaction hash copied!",
  trigger: "manual",
  hideOnClick: false,
});
watch(
  copied,
  (copied) => {
    if (copied) {
      a.show();
    } else {
      a.hide();
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.transaction-hash-button {
  @apply w-max;

  .transaction-hash-button-icon {
    @apply -mr-1 ml-2 h-6 w-6;
  }
}
</style>
