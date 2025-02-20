<template>
  <CommonContentBlock>
    <div class="transaction-progress">
      <template v-if="isSameAddressDifferentDestination">
        <div class="info-column left">
          <div class="flex flex-col items-center justify-center gap-1 md:flex-row">
            <span>From</span>
            <img
              v-tooltip="fromDestination.label"
              :src="fromDestination.iconUrl"
              :alt="fromDestination.label"
              class="h-6 w-6"
            />
          </div>
          <div>Your account {{ shortenAddress(fromAddress) }}</div>
        </div>
        <div class="info-column right">
          <div class="flex flex-col items-center justify-center gap-1 md:flex-row">
            <span>To</span>
            <img
              v-tooltip="toDestination.label"
              :src="toDestination.iconUrl"
              :alt="toDestination.label"
              class="h-6 w-6"
            />
          </div>
          <div>{{ isSameAddress ? "Your account" : "Another account" }} {{ shortenAddress(toAddress) }}</div>
        </div>
      </template>
      <template v-else>
        <div class="info-column left">
          <AddressAvatar class="mx-auto h-12 w-12" :address="fromAddress">
            <template #icon>
              <img v-tooltip="fromDestination.label" :src="fromDestination.iconUrl" :alt="fromDestination.label" />
            </template>
          </AddressAvatar>
          <div>
            From your account
            <br />
            {{ shortenAddress(fromAddress) }}
          </div>
        </div>
        <div class="info-column right">
          <AddressAvatar class="mx-auto h-12 w-12" :address="toAddress">
            <template #icon>
              <img v-tooltip="toDestination.label" :src="toDestination.iconUrl" :alt="toDestination.label" />
            </template>
          </AddressAvatar>
          <div>
            {{ isSameAddress ? "To your account" : "To another account" }}
            <br />
            {{ shortenAddress(toAddress) }}
          </div>
        </div>
      </template>

      <AnimationsTransactionProgress :state="transactionProgressAnimationState" class="transaction-animation" />

      <div v-if="fromExplorerLink || fromTransactionHash" class="info-column bottom-left mt-block-gap-1/2">
        <TransactionHashButton :explorer-url="fromExplorerLink" :transaction-hash="fromTransactionHash" />
      </div>
      <div v-else-if="$slots['from-button']" class="info-column bottom-left mt-block-gap-1/2">
        <slot name="from-button" />
      </div>
      <div v-if="toExplorerLink || toTransactionHash" class="info-column bottom-right mt-block-gap-1/2">
        <TransactionHashButton :explorer-url="toExplorerLink" :transaction-hash="toTransactionHash" />
      </div>
      <div v-else-if="$slots['to-button']" class="info-column bottom-right mt-block-gap-1/2">
        <slot name="to-button" />
      </div>
    </div>
    <TransactionHashButton
      v-if="explorerLink || transactionHash"
      :explorer-url="explorerLink"
      :transaction-hash="transactionHash"
      class="mx-auto mt-block-gap"
    />

    <div class="mt-block-padding flex flex-wrap items-center justify-center gap-4">
      <div>
        <span class="text-neutral-400">Value:</span>
        <span class="ml-1 inline-flex items-center">
          {{ parseTokenAmount(token.amount, token.decimals) }}
          {{ token.symbol }}
          <TokenImage class="ml-1.5 h-5 w-5" v-bind="token" />
        </span>
      </div>
      <div v-if="expectedCompleteTimestamp && !completed">
        <span class="text-neutral-400">Estimated time: </span>
        <CommonTimer format="human-readable" :future-date="expectedCompleteTimestamp">
          <template #default="{ timer, isTimerFinished }">
            <template v-if="isTimerFinished">Funds should arrive soon!</template>
            <template v-else>
              <span class="tabular-nums">{{ timer }} left</span>
            </template>
          </template>
        </CommonTimer>
      </div>
    </div>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
import type { AnimationState } from "@/components/animations/TransactionProgress.vue";
import type { TokenAmount } from "@/types";

const props = defineProps({
  fromAddress: {
    type: String,
    required: true,
  },
  fromDestination: {
    type: Object as PropType<TransactionDestination>,
    required: true,
  },
  toAddress: {
    type: String,
    required: true,
  },
  toDestination: {
    type: Object as PropType<TransactionDestination>,
    required: true,
  },
  // left right buttons
  fromExplorerLink: {
    type: String,
  },
  fromTransactionHash: {
    type: String,
  },
  toExplorerLink: {
    type: String,
  },
  toTransactionHash: {
    type: String,
  },
  // center button
  explorerLink: {
    type: String,
  },
  transactionHash: {
    type: String,
  },
  token: {
    type: Object as PropType<TokenAmount>,
    required: true,
  },
  expectedCompleteTimestamp: {
    type: String,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  failed: {
    type: Boolean,
    default: false,
  },
  animationState: {
    type: String as PropType<AnimationState>,
  },
});

const isSameAddress = computed(() => props.fromAddress === props.toAddress);
const isSameAddressDifferentDestination = computed(
  () => isSameAddress.value && props.fromDestination.label !== props.toDestination.label
);

const transactionProgressAnimationState = computed<AnimationState>(() => {
  if (props.animationState) return props.animationState;
  if (props.failed) return "failed";
  if (props.completed) return "completed";
  return "playing";
});
</script>

<style lang="scss" scoped>
.transaction-progress {
  @apply grid grid-flow-row grid-cols-3 grid-rows-[max-content] items-center gap-x-4 text-center;
  grid-template-areas: "info-col-left divider info-col-right" "info-col-bottom-left space info-col-bottom-right";

  .info-column {
    @apply flex flex-col items-center justify-center gap-2;
    &.left {
      grid-area: info-col-left;
    }
    &.right {
      grid-area: info-col-right;
    }
    &.bottom-left {
      grid-area: info-col-bottom-left;
    }
    &.bottom-right {
      grid-area: info-col-bottom-right;
    }
  }
  .transaction-animation {
    grid-area: divider;
  }
  .divider {
    @apply relative border-t border-dashed border-neutral-500;
    grid-area: divider;

    .airplane {
      @apply absolute h-8 w-8;
      animation: airplane 3s linear infinite;
      @keyframes airplane {
        0% {
          left: 0;
          transform: translate(0, -50%) scale(0);
          opacity: 0;
        }
        30%,
        60% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% {
          left: 100%;
          transform: translate(-100%, -50%) scale(0);
          opacity: 0;
        }
      }
    }
  }
}
</style>
