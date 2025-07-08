<template>
  <div>
    <h1 class="h1 mt-block-gap-1/2 text-center">
      {{ transaction.info.completed ? "Transaction completed" : "Transaction submitted" }}
    </h1>
    <CommonHeightTransition :opened="!transaction.info.completed">
      <p class="mb-4 text-center">
        <template v-if="withdrawalManualFinalizationRequired && transaction.info.withdrawalFinalizationAvailable">
          Your funds will be available on <span class="font-medium">{{ transaction.to.destination.label }}</span> after
          you claim the withdrawal.
        </template>
        <template v-else-if="isCustomNode">
          Your funds will be available for claiming after the transaction is processed on
          <span class="font-medium">{{ eraNetwork.name }}</span> and executed on the
          <span class="font-medium">{{ eraNetwork.l1Network?.name }}</span
          >.
        </template>
        <template v-else>
          Your funds will be available on <span class="font-medium">{{ transaction.to.destination.label }}</span> after
          the
          <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank">~5+ hour delay</a>.
          During this time, the transaction will be processed
          {{
            withdrawalManualFinalizationRequired
              ? "and become available for claiming."
              : "and finalized. You are free to close this page."
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
          <p>You can claim your withdrawal now.</p>
        </CommonAlert>
        <CommonAlert
          v-else-if="!props.transaction.token.l1Address && !isCustomBridgeToken"
          variant="warning"
          :icon="ExclamationTriangleIcon"
          class="mb-4"
        >
          <p>This withdrawal was made through a third-party bridge. Please use that bridge to claim your withdrawal.</p>
        </CommonAlert>
        <CommonAlert v-else variant="warning" :icon="ExclamationTriangleIcon" class="mb-4">
          <p>
            You will have to claim your withdrawal once it's processed. Claiming will require paying the fee on the
            {{ eraNetwork.l1Network?.name }} network.
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
            Change wallet network to claim
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
          Fee estimation error: {{ feeError.message }}
        </CommonErrorBlock>
        <TransactionFeeDetails
          v-else
          label="Claiming fee:"
          :fee-token="feeToken"
          :fee-amount="fee"
          :loading="feeLoading"
          class="mt-4"
        />

        <TransactionEthereumTransactionFooter>
          <template #after-checks>
            <CommonButton :disabled="continueButtonDisabled" class="w-full" variant="primary" @click="buttonContinue()">
              <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                <span v-if="finalizeTransactionStatus === 'processing'">Processing...</span>
                <span v-else-if="finalizeTransactionStatus === 'waiting-for-signature'">Waiting for confirmation</span>
                <span
                  v-else-if="
                    finalizeTransactionStatus === 'sending' ||
                    finalizeTransactionStatus === 'done' ||
                    transaction.info.toTransactionHash
                  "
                  class="flex items-center gap-2"
                >
                  <span>Claiming withdrawal...</span>
                  <CommonSpinner variant="text-color" class="h-5 w-5" aria-hidden="true" />
                </span>
                <span v-else>Claim withdrawal</span>
              </transition>
            </CommonButton>
            <TransactionButtonUnderlineConfirmTransaction
              :opened="finalizeTransactionStatus === 'waiting-for-signature'"
            />
          </template>
          <template #change-network-auto>Change wallet network to claim</template>
          <template #change-network-manual="{ walletName }">
            Change network manually in your {{ walletName }} wallet to claim
          </template>
        </TransactionEthereumTransactionFooter>
      </div>
    </CommonHeightTransition>

    <div class="mt-5 flex flex-wrap items-center justify-center gap-block-gap">
      <CommonButton as="RouterLink" :to="{ name: 'assets' }" size="xs">Go to Assets page</CommonButton>
      <CommonButton
        size="xs"
        :as="makeAnotherTransaction ? undefined : 'RouterLink'"
        :to="{ name: 'bridge-withdraw' }"
        @click="makeAnotherTransaction && makeAnotherTransaction()"
      >
        Make another transaction
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
