<template>
  <ModalTransactionDepositUnavailable />

  <div v-if="depositsDisabled">
    <PageTitle>{{ $t("common.bridge") }}</PageTitle>
    <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>
        {{ $t("bridge.bridgeTemporarilyDisabled", { network: eraNetwork.name }) }}
        <a
          href="https://github.com/zkSync-Community-Hub/zksync-developers/discussions/519"
          target="_blank"
          class="underline underline-offset-2"
          >{{ $t("bridge.upgradeInformation") }}</a
        >.
      </p>
    </CommonAlert>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-block-gap">
      <CommonButton as="RouterLink" :to="{ name: 'assets' }" size="xs">{{ $t("bridge.goToAssets") }}</CommonButton>
    </div>
  </div>
  <DepositView v-else />
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

import { bridge as bridgeMeta } from "@/data/meta";
import DepositView from "@/views/transactions/Deposit.vue";

useSeoMeta({
  title: bridgeMeta.title,
  ogTitle: bridgeMeta.title,
  description: bridgeMeta.description,
  ogDescription: bridgeMeta.description,
  ogImage: bridgeMeta.previewImg.src,
  ogImageAlt: bridgeMeta.previewImg.alt,
  twitterImage: bridgeMeta.previewImg.src,
  twitterImageAlt: bridgeMeta.previewImg.alt,
  twitterCard: "summary_large_image",
});

const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const depositsDisabled = computed(() => false);
</script>

<style lang="scss" scoped></style>
