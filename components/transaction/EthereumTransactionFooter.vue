<template>
  <div class="transaction-footer">
    <!-- Change network -->
    <transition v-bind="TransitionAlertScaleInOutTransition">
      <CommonErrorBlock
        v-if="buttonStep === 'network' && switchingNetworkError"
        class="mb-2"
        @try-again="onboardStore.setCorrectNetwork"
      >
        Network change error: {{ switchingNetworkError.message }}
      </CommonErrorBlock>
    </transition>

    <div v-if="buttonStep === 'connect'" class="transaction-footer-row">
      <CommonButton variant="primary" :disabled="isConnectingWallet" class="w-full" @click="onboardStore.openModal">
        Connect wallet
      </CommonButton>
    </div>
    <div v-if="buttonStep === 'network'" class="transaction-footer-row">
      <CommonButtonTopInfo>Incorrect network selected in your wallet</CommonButtonTopInfo>
      <template v-if="l1Network">
        <CommonButton
          v-if="connectorName !== 'WalletConnect'"
          type="submit"
          :disabled="switchingNetworkInProgress"
          variant="primary"
          class="w-full"
          data-testid="change-l1-network-button"
          @click="onboardStore.setCorrectNetwork"
        >
          <slot v-bind="{ l1Network, walletName }" name="change-network-auto">
            Change wallet network to {{ l1Network.name }}
          </slot>
        </CommonButton>
        <CommonButton v-else disabled variant="primary" class="w-full">
          <slot v-bind="{ l1Network, walletName }" name="change-network-manual">
            Change network manually to {{ l1Network.name }} in your {{ walletName }} wallet
          </slot>
        </CommonButton>
      </template>
      <template v-else>
        <CommonButton disabled variant="primary" class="w-full">
          L1 network is not available on {{ selectedNetwork.name }}
        </CommonButton>
      </template>
    </div>
    <div v-else-if="buttonStep === 'continue'" class="transaction-footer-row">
      <slot name="after-checks" />
    </div>

    <TransactionButtonUnderlineContinueInWallet :opened="continueInWalletTipDisplayed" />
  </div>
</template>

<script lang="ts" setup>
const onboardStore = useOnboardStore();

const {
  account,
  isConnectingWallet,
  isCorrectNetworkSet,
  switchingNetworkInProgress,
  switchingNetworkError,
  connectorName,
  walletName,
} = storeToRefs(onboardStore);
const { selectedNetwork, l1Network } = storeToRefs(useNetworkStore());

const buttonStep = computed(() => {
  if (!account.value.address || isConnectingWallet.value) {
    return "connect";
  } else if (!isCorrectNetworkSet.value) {
    return "network";
  } else {
    return "continue";
  }
});

const continueInWalletTipDisplayed = computed(() => {
  if (buttonStep.value === "network" && switchingNetworkInProgress.value) {
    return true;
  }
  return false;
});
</script>

<style lang="scss" scoped>
.transaction-footer {
  @apply sticky bottom-0 z-10 flex flex-col items-center bg-neutral-50/60 bg-opacity-60 pb-2 pt-4 backdrop-blur-sm dark:bg-black dark:bg-opacity-60;

  .transaction-footer-row {
    @apply flex w-full flex-col items-center;
  }
}
</style>
