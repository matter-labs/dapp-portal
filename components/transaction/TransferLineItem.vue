<template>
  <TransactionLineItem
    :icon="transactionIcon"
    :explorer-url="blockExplorerUrl"
    :transaction-hash="transfer.transactionHash!"
  >
    <template v-if="inProgress" #icon>
      <CommonSpinner variant="dark" aria-hidden="true" />
    </template>
    <template #top-left>{{ label }}</template>
    <template #bottom-left>
      <template v-if="chainsLabel">
        <template v-if="chainsLabel.from !== chainsLabel.to">
          <span>{{ chainsLabel.from }}</span>
          <ArrowRightIcon class="relative -top-px mx-1 inline h-4 w-4" aria-hidden="true" />
          <span>{{ chainsLabel.to }}</span
          >.
        </template>
        <template v-else>
          <span>{{ chainsLabel.from }}</span
          >.
        </template>
      </template>
      <span>{{ timeAgo }}</span>
      <slot name="bottom-left"></slot>
    </template>
    <template #top-right>
      <TokenAmount v-if="token" :token="token" :amount="computeAmount" :direction="direction" />
    </template>
    <template #bottom-right>
      <TotalPrice v-if="token" :token="token" :amount="computeAmount" :direction="direction" />
    </template>
  </TransactionLineItem>
</template>

<script lang="ts" setup>
import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/vue/24/outline";
import { useTimeAgo } from "@vueuse/core";

import TokenAmount from "@/components/transaction/lineItem/TokenAmount.vue";
import TotalPrice from "@/components/transaction/lineItem/TotalPrice.vue";

const props = defineProps({
  as: {
    type: [String, Object] as PropType<string | Component>,
    default: "div",
  },
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
const { eraNetwork, blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());

const direction = computed(() => {
  if (props.transfer.to === props.transfer.from && props.transfer.toNetwork === props.transfer.fromNetwork) {
    return undefined;
  }
  if (props.transfer.toNetwork === "L2" && props.transfer.to === account.value.address) {
    return "in";
  } else {
    return "out";
  }
});

const formatAddress = (address: string) => {
  if (address === account.value.address) {
    return $t("transaction.yourAccount");
  }
  return shortenAddress(address);
};
const label = computed(() => {
  if (props.transfer.type === "transfer") {
    if (direction.value === "in") {
      return `Received from ${formatAddress(props.transfer.from)}`;
    }
    return `Sent to ${formatAddress(props.transfer.to)}`;
  } else if (props.transfer.type === "withdrawal") {
    if (props.transfer.to === account.value.address) {
      return $t("transaction.bridged");
    }
    return $t("transaction.bridgedTo", { address: formatAddress(props.transfer.to) });
  } else if (props.transfer.type === "deposit") {
    if (direction.value === "in") {
      if (props.transfer.from === account.value.address) {
        return "Bridged";
      }
      return $t("transaction.bridgedFrom", { address: formatAddress(props.transfer.from) });
    } else {
      return `Sent to ${formatAddress(props.transfer.to)}`;
    }
  } else if (props.transfer.type === "fee") {
    return $t("transaction.feePayment");
  } else if (props.transfer.type === "mint") {
    return $t("transaction.minted");
  }
  return props.transfer.type || "Unknown";
});

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
const transactionIcon = computed(() => {
  switch (props.transfer.type) {
    case "transfer":
      return direction.value === "in" ? ArrowDownLeftIcon : ArrowUpRightIcon;
    case "withdrawal":
      return MinusIcon;
    case "deposit":
      return direction.value === "in" ? PlusIcon : ArrowUpRightIcon;
    case "mint":
      return PlusIcon;
    case "fee":
      return BanknotesIcon;
    case undefined:
      return undefined;
    default:
      if (direction.value) {
        return direction.value === "in" ? ArrowDownLeftIcon : ArrowRightIcon;
      }
      return undefined;
  }
});

const timeAgo = useTimeAgo(props.transfer.timestamp);
</script>
