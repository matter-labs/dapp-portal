<template>
  <CommonButtonLine class="transaction-withdrawal-line-item">
    <div class="line-button-with-img-image">
      <DestinationIconContainer>
        <CommonSpinner v-if="inProgress" variant="dark" />
        <MinusIcon v-else aria-hidden="true" />
      </DestinationIconContainer>
    </div>
    <div class="withdrawal-line-body">
      <div class="withdrawal-line-top">
        <div class="line-button-with-img-body">
          <CommonButtonLineBodyInfo class="text-left">
            <template #label>
              {{ label }}
            </template>
            <template #underline>
              <template v-if="chainsLabel">
                <span>{{ chainsLabel.from }}</span>
                <ArrowRightIcon class="relative -top-px mx-1 inline h-4 w-4" aria-hidden="true" />
                <span>{{ chainsLabel.to }}</span
                >.
              </template>
              <span>{{ timeAgo }}</span>
            </template>
          </CommonButtonLineBodyInfo>
          <div class="flex flex-wrap items-center gap-x-2 sm:hidden">
            <TokenAmount v-if="token" :token="token" :amount="computeAmount" />
          </div>
        </div>
        <div class="line-button-with-img-right">
          <CommonButtonLineBodyInfo ref="el" class="hidden text-right sm:block">
            <template #secondary>
              <TokenAmount v-if="token" :token="token" :amount="computeAmount" />
            </template>
            <template #underline>
              <TotalPrice v-if="token" :token="token" :amount="computeAmount" />
            </template>
          </CommonButtonLineBodyInfo>
        </div>
      </div>
      <div class="withdrawal-line-separator"></div>
      <div class="withdrawal-line-bottom">
        <div>Withdrawal is available for claiming on the {{ eraNetwork.l1Network?.name }} network</div>
        <CommonButton variant="primary" class="withdrawal-claim-button">{{ $t("transaction.goToClaim") }}</CommonButton>
      </div>
    </div>
  </CommonButtonLine>
</template>

<script lang="ts" setup>
import { ArrowRightIcon, MinusIcon } from "@heroicons/vue/24/outline";
import { useTimeAgo } from "@vueuse/core";

import TokenAmount from "@/components/transaction/lineItem/TokenAmount.vue";
import TotalPrice from "@/components/transaction/lineItem/TotalPrice.vue";

const props = defineProps({
  transfer: {
    type: Object as PropType<Transfer>,
    required: true,
  },
  inProgress: {
    type: Boolean,
    default: false,
  },
});

const { account } = storeToRefs(useOnboardStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());

const label = computed(() => {
  const article = props.inProgress ? $t("transaction.bridging") : $t("transaction.bridged");
  if (props.transfer.to === account.value.address) {
    return article;
  }
  return `${article} to ${formatAddress(props.transfer.to)}`;
});

const formatAddress = (address: string) => {
  if (address === account.value.address) {
    return "your account";
  }
  return shortenAddress(address);
};
const getLayerName = (layer: NetworkLayer) => {
  if (layer === "L1") {
    return eraNetwork.value.l1Network?.name;
  }
  return eraNetwork.value.name;
};
const chainsLabel = computed(() => {
  if (!eraNetwork.value.l1Network) {
    return;
  }
  return {
    from: getLayerName(props.transfer.fromNetwork),
    to: getLayerName(props.transfer.toNetwork),
  };
});
const computeAmount = computed(() => {
  return BigInt(props.transfer.amount || "0").toString();
});
const token = computed(() => {
  return props.transfer.token;
});

const timeAgo = useTimeAgo(props.transfer.timestamp);
</script>

<style lang="scss" scoped>
.transaction-withdrawal-line-item {
  @apply flex items-center gap-4;

  .line-button-with-img-image {
    @apply my-[1.5px] aspect-square h-auto w-12 flex-none self-start;
  }
  .withdrawal-line-body {
    @apply w-full;
    .withdrawal-line-separator {
      @apply my-4 w-full border-t border-neutral-200 dark:border-neutral-800;
    }

    .withdrawal-line-top {
      @apply grid w-full grid-cols-[1fr_max-content] items-center sm:gap-4;

      .line-button-with-img-body {
        @apply w-full overflow-hidden;
      }
      .line-button-with-img-right {
        @apply w-max;
      }
    }
    .withdrawal-line-bottom {
      @apply flex flex-col items-center justify-between gap-4 xs:flex-row;

      .withdrawal-claim-button {
        @apply w-full whitespace-nowrap xs:w-auto;
      }
    }
  }
}
</style>
