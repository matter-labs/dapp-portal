<template>
  <CommonContentBlock>
    <div class="relative flex flex-col gap-block-gap">
      <button
        v-if="showCloseButton"
        class="absolute right-0 top-0 -mx-block-padding-1/4 -my-block-padding-1/2 p-1 sm:-mx-block-padding-1/2"
        @click="ecosystemBannerClosed = true"
      >
        <XMarkIcon aria-hidden="true" class="h-6 w-6" />
      </button>
      <p class="text-left xs:text-center">{{ $t("ecosystem.exploreWonders") }}</p>
      <AnimationsEcosystemLogotypes />
      <CommonButton
        variant="primary"
        as="a"
        href="https://zksync.dappradar.com/ecosystem"
        target="_blank"
        class="w-full"
      >
        {{ $t("ecosystem.exploreEcosystem") }}
        <ArrowTopRightOnSquareIcon aria-hidden="true" class="ml-2 h-6 w-6" />
      </CommonButton>
    </div>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/vue/24/outline";

import useEcosystemBanner from "@/composables/zksync/deposit/useEcosystemBanner";

const { ecosystemBannerClosed } = useEcosystemBanner();

defineProps({
  showCloseButton: {
    type: Boolean,
    default: false,
  },
});
</script>
