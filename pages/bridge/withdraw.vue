<template>
  <ModalTransactionWithdrawalUnavailable />

  <div v-if="withdrawalsDisabled">
    <PageTitle>Bridge</PageTitle>
    <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-gap">
      <p>
        {{ $t("bridge.withdrawDisabled", { network: eraNetwork.name }) }}
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
      <CommonButton size="xs" as="RouterLink" :to="{ name: 'bridge' }">{{
        $t("bridge.bridgeTo", { network: eraNetwork.name })
      }}</CommonButton>
    </div>
  </div>
  <TransferView v-else type="withdrawal" />
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

import { bridge as bridgeMeta } from "@/data/meta";
import { useZkSyncProviderStore } from "@/store/zksync/provider";
import TransferView from "@/views/transactions/Transfer.vue";

useSeoMeta({
  title: bridgeMeta.title,
  ogTitle: bridgeMeta.title,
  description: bridgeMeta.description,
  ogDescription: bridgeMeta.description,
  ogImage: bridgeMeta.previewImg.src,
  ogImageAlt: bridgeMeta.previewImg.alt,
  twitterCard: "summary_large_image",
  twitterImage: bridgeMeta.previewImg.src,
  twitterImageAlt: bridgeMeta.previewImg.alt,
});

const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const withdrawalsDisabled = computed(() => false);
</script>

<style lang="scss" scoped></style>
