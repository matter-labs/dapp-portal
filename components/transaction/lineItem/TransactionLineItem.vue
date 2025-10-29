<template>
  <CommonButtonLineWithImg v-bind="buttonProps" class="transaction-line-item" @click="handleClick()">
    <template #image>
      <DestinationIconContainer>
        <slot name="icon">
          <XMarkIcon v-if="failed" class="failed-badge-icon" aria-hidden="true" />
          <component :is="icon" v-else-if="icon" aria-hidden="true" />
        </slot>
      </DestinationIconContainer>
    </template>
    <template #default>
      <CommonButtonLineBodyInfo class="text-left">
        <template v-if="$slots['top-left']" #label>
          <slot name="top-left" />
        </template>
        <template v-if="failed || $slots['bottom-left']" #underline>
          <div v-if="failed" class="failed-underline">{{ $t("transaction.failed") }}</div>
          <slot v-else name="bottom-left" />
        </template>
      </CommonButtonLineBodyInfo>
      <div class="flex flex-wrap items-center gap-x-2 sm:hidden">
        <slot name="top-right" />
        <div v-if="$slots['bottom-right']" class="text-gray-secondary opacity-70 dark:text-white">
          <slot name="bottom-right" />
        </div>
      </div>
    </template>
    <template #right>
      <CommonButtonLineBodyInfo ref="el" class="hidden text-right sm:block">
        <template v-if="$slots['top-right']" #secondary>
          <slot name="top-right" />
        </template>
        <template v-if="$slots['bottom-right']" #underline>
          <slot name="bottom-right" />
        </template>
      </CommonButtonLineBodyInfo>
    </template>
  </CommonButtonLineWithImg>
</template>

<script lang="ts" setup>
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import { useTippy } from "vue-tippy";

import type { RouteLocation } from "vue-router";

const props = defineProps({
  icon: {
    type: [String, Object, Function] as PropType<string | Component>,
  },
  transactionHash: {
    type: String,
  },
  explorerUrl: {
    type: String,
  },
  to: {
    type: Object as PropType<RouteLocation>,
  },
  failed: {
    type: Boolean,
    default: false,
  },
});

const { copy, copied } = useCopy(computed(() => props.transactionHash || ""));
const el = ref<{ $el?: HTMLButtonElement } | undefined>();
const a = useTippy(
  computed(() => el.value?.$el?.parentElement?.parentElement || undefined),
  {
    content: "Transaction hash copied!",
    trigger: "manual",
    hideOnClick: false,
  }
);
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

const transactionUrl = computed(() => {
  if (!props.explorerUrl) {
    return undefined;
  }
  return `${props.explorerUrl}/tx/${props.transactionHash}`;
});

const buttonProps = computed(() => {
  if (props.to) {
    return {
      as: "RouterLink",
      to: props.to,
      icon: InformationCircleIcon,
    };
  } else if (transactionUrl.value) {
    return {
      as: "a",
      href: transactionUrl.value,
      target: "_blank",
      icon: ArrowTopRightOnSquareIcon,
    };
  } else {
    return {
      icon: DocumentDuplicateIcon,
    };
  }
});

const handleClick = () => {
  if (!props.to && !transactionUrl.value && props.transactionHash) {
    copy();
  }
};
</script>

<style lang="scss">
.transaction-line-item {
  .failed-badge-icon {
    @apply text-red-500;
  }
  .failed-underline {
    @apply text-red-500;
  }
}
</style>
