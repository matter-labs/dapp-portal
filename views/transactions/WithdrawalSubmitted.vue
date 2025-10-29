<template>
  <div>
    <h1 class="h1 mt-block-gap-1/2 text-center">
      {{ transaction.info.completed ? $t("transaction.completed") : $t("transaction.submitted") }}
    </h1>
    <CommonHeightTransition :opened="!transaction.info.completed">
      <p class="mb-4 text-center">
        <template v-if="withdrawalManualFinalizationRequired && transaction.info.withdrawalFinalizationAvailable">
          {{ $t("transaction.fundsAvailableAfterClaim", { network: transaction.to.destination.label }) }}
        </template>
        <template v-else-if="isCustomNode">
          {{
            $t("transaction.fundsAvailableAfterProcessing", {
              network: eraNetwork.name,
              l1Network: eraNetwork.l1Network?.name,
            })
          }}
        </template>
        <template v-else>
          {{
            $t("transaction.fundsAvailableAfterDelay", {
              network: transaction.to.destination.label,
              delay: $t("transaction.withdrawalDelay"),
            })
          }}
          {{
            withdrawalManualFinalizationRequired
              ? $t("transaction.processedForClaiming")
              : $t("transaction.processedFinalized")
          }}
        </template>
      </p>
      <template v-if="withdrawalManualFinalizationRequired">
        <CommonAlert
          v-if="withdrawalFinalizationAvailable"
          variant="warning"
          :icon="ExclamationTriangleIcon"
          class="mb-4"
        >
          <p>{{ $t("transaction.claimNow") }}</p>
        </CommonAlert>
        <CommonAlert
          v-else-if="!props.transaction.token.l1Address && !isCustomBridgeToken"
          variant="warning"
          :icon="ExclamationTriangleIcon"
          class="mb-4"
        >
          <p>{{ $t("transaction.thirdPartyBridgeClaim") }}</p>
        </CommonAlert>
        <CommonAlert v-else variant="warning" :icon="ExclamationTriangleIcon" class="mb-4">
          <p>
            {{ $t("transaction.claimRequiresFee", { network: eraNetwork.l1Network?.name }) }}
          </p>
        </CommonAlert>
      </template>
    </CommonHeightTransition>
    <TransactionProgress
      :from-address="transaction.from.address"
      :from-destination="transaction.from.destination"
      :to-address="transaction.to.address"
      :to-destination="transaction.to.destination"
      :from-explorer-link="blockExplorerUrl"
      :from-transaction-hash="transaction.transactionHash"
      :to-transaction-hash="finalizeTransactionHash || transaction.info.toTransactionHash"
      :to-explorer-link="finalizeTransactionHash || transaction.info.toTransactionHash ? l1BlockExplorerUrl : undefined"
      :token="transaction.token"
      :completed="transaction.info.completed"
      :failed="transaction.info.failed"
      :animation-state="withdrawalFinalizationAvailable ? 'stopped-in-the-end' : undefined"
      :expected-complete-timestamp="
        withdrawalFinalizationAvailable ? undefined : transaction.info.expectedCompleteTimestamp
      "
    >
      <template v-if="withdrawalFinalizationAvailable" #to-button>
        <template v-if="!isCorrectNetworkSet">
          <CommonButton
            size="xs"
            variant="light"
            :disabled="connectorName === 'WalletConnect'"
            @click="onboardStore.setCorrectNetwork()"
          >
            {{ $t("transaction.changeNetworkToClaim") }}
          </CommonButton>
        </template>
        <CommonButton
          v-else-if="feeLoading || fee"
          size="xs"
          variant="light"
          :disabled="continueButtonDisabled"
          @click="buttonContinue()"
        >
          <CommonContentLoader v-if="feeLoading && !fee" :length="9" />
          <span v-else>Claim</span>
          <CommonSpinner
            v-if="finalizeTransactionStatus !== 'not-started' || transaction.info.toTransactionHash"
            variant="text-color"
            class="-mr-1 ml-2 h-6 w-6"
            aria-hidden="true"
          />
        </CommonButton>
      </template>
    </TransactionProgress>
    <CommonHeightTransition :opened="withdrawalFinalizationAvailable">
      <div>
        <CommonErrorBlock v-if="feeError" class="mt-2" @try-again="estimate">
          {{ $t("transaction.feeEstimationError", { message: feeError.message }) }}
        </CommonErrorBlock>
        <TransactionFeeDetails
          v-else
          :label="$t('transaction.claimingFee')"
          :fee-token="feeToken"
          :fee-amount="fee"
          :loading="feeLoading"
          class="mt-4"
        />

        <TransactionEthereumTransactionFooter>
          <template #after-checks>
            <CommonButton :disabled="continueButtonDisabled" class="w-full" variant="primary" @click="buttonContinue()">
              <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                <span v-if="finalizeTransactionStatus === 'processing'">{{ $t("transaction.processing") }}</span>
                <span v-else-if="finalizeTransactionStatus === 'waiting-for-signature'">{{
                  $t("transaction.waitingForConfirmation")
                }}</span>
                <span
                  v-else-if="
                    finalizeTransactionStatus === 'sending' ||
                    finalizeTransactionStatus === 'done' ||
                    transaction.info.toTransactionHash
                  "
                  class="flex items-center gap-2"
                >
                  <span>{{ $t("transaction.claimingWithdrawal") }}</span>
                  <CommonSpinner variant="text-color" class="h-5 w-5" aria-hidden="true" />
                </span>
                <span v-else>{{ $t("transaction.claimWithdrawal") }}</span>
              </transition>
            </CommonButton>
            <TransactionButtonUnderlineConfirmTransaction
              :opened="finalizeTransactionStatus === 'waiting-for-signature'"
            />
          </template>
          <template #change-network-auto>{{ $t("transaction.changeNetworkToClaim") }}</template>
          <template #change-network-manual="{ walletName }">
            {{ $t("transaction.changeNetworkManuallyToClaim", { walletName }) }}
          </template>
        </TransactionEthereumTransactionFooter>
      </div>
    </CommonHeightTransition>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-block-gap">
      <CommonButton as="RouterLink" :to="{ name: 'assets' }" size="xs">{{ $t("bridge.goToAssets") }}</CommonButton>
      <CommonButton
        size="xs"
        :as="makeAnotherTransaction ? undefined : 'RouterLink'"
        :to="{ name: 'bridge-withdraw' }"
        @click="makeAnotherTransaction && makeAnotherTransaction()"
      >
        {{ $t("transaction.makeAnotherTransaction") }}
      </CommonButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

import useWithdrawalFinalization from "@/composables/zksync/useWithdrawalFinalization";
import { customBridgeTokens } from "@/data/customBridgeTokens";
import { isCustomNode } from "@/data/networks";

const props = defineProps({
  transaction: {
    type: Object as PropType<TransactionInfo>,
    required: true,
  },
  makeAnotherTransaction: {
    type: Function as PropType<() => void>,
    required: false,
  },
});

const onboardStore = useOnboardStore();
const transactionStatusStore = useZkSyncTransactionStatusStore();
const { eraNetwork, blockExplorerUrl } = storeToRefs(useZkSyncProviderStore());
const { l1BlockExplorerUrl } = storeToRefs(useNetworkStore());
const { connectorName, isCorrectNetworkSet } = storeToRefs(onboardStore);

const isCustomBridgeToken = computed(() => {
  // Check if this is a custom bridge token by looking for l1BridgeAddress
  // For existing withdrawals, we need to look it up from the custom bridge tokens config
  if (props.transaction.token.l1BridgeAddress) {
    return true;
  }

  // Fallback: lookup from custom bridge tokens configuration
  const customBridgeToken = customBridgeTokens.find(
    (token) =>
      token.l2Address.toLowerCase() === props.transaction.token.address.toLowerCase() &&
      token.chainId === eraNetwork.value.l1Network?.id
  );

  return !!customBridgeToken?.l1BridgeAddress;
});
const withdrawalManualFinalizationRequired = computed(() => {
  return !props.transaction.info.completed;
});
const withdrawalFinalizationAvailable = computed(() => {
  return withdrawalManualFinalizationRequired.value && props.transaction.info.withdrawalFinalizationAvailable;
});

const {
  feeToken,
  totalFee: fee,
  estimationError: feeError,
  estimationInProgress: feeLoading,
  estimateFee: estimate,

  status: finalizeTransactionStatus,
  transactionHash: finalizeTransactionHash,
  commitTransaction,
} = useWithdrawalFinalization(computed(() => props.transaction));
watch(
  withdrawalFinalizationAvailable,
  (finalizationAvailable) => {
    if (finalizationAvailable) {
      estimate();
    }
  },
  { immediate: true }
);

const continueButtonDisabled = computed(() => {
  if (finalizeTransactionStatus.value !== "not-started") return true;
  if (feeLoading.value || !fee.value) return true;
  if (props.transaction.info.toTransactionHash) return true;
  return false;
});
const buttonContinue = async () => {
  if (continueButtonDisabled.value) return;
  await commitTransaction();

  if (finalizeTransactionStatus.value === "done") {
    transactionStatusStore.updateTransactionData(props.transaction.transactionHash, {
      ...props.transaction,
      info: {
        ...props.transaction.info,
        completed: true,
        toTransactionHash: finalizeTransactionHash.value! as string,
      },
    });
  }
};
</script>
