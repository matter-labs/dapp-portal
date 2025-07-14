<template>
  <div>
    <NetworkDeprecationAlert v-if="step === 'form'" />
    <slot v-if="step === 'form'" name="title" />
    <PageTitle
      v-else-if="step === 'withdrawal-finalization-warning'"
      :back-function="
        () => {
          step = 'form';
        }
      "
    >
      Withdrawal claim required
    </PageTitle>
    <PageTitle
      v-else-if="step === 'confirm'"
      :back-function="
        () => {
          step = 'form';
        }
      "
    >
      Confirm transaction
    </PageTitle>

    <NetworkSelectModal
      v-model:opened="fromNetworkModalOpened"
      title="From"
      :network-key="destinations.era.key"
      @update:network-key="fromNetworkSelected($event)"
    />
    <NetworkSelectModal
      v-model:opened="toNetworkModalOpened"
      title="To"
      :network-key="destination.key"
      @update:network-key="toNetworkSelected($event)"
    />

    <CommonErrorBlock v-if="tokensRequestError" @try-again="fetchBalances">
      Getting tokens error: {{ tokensRequestError.message }}
    </CommonErrorBlock>
    <CommonErrorBlock v-else-if="balanceError" @try-again="fetchBalances">
      Getting balances error: {{ balanceError.message }}
    </CommonErrorBlock>
    <form v-else @submit.prevent="">
      <template v-if="step === 'form'">
        <TransactionWithdrawalsAvailableForClaimAlert />
        <CommonInputTransactionAmount
          v-model="amount"
          v-model:error="amountError"
          v-model:token-address="amountInputTokenAddress"
          :label="type === 'withdrawal' ? 'From' : undefined"
          :tokens="availableTokens"
          :balances="availableBalances"
          :max-amount="maxAmount"
          :loading="tokensRequestInProgress || balanceInProgress || feeLoading"
        >
          <template v-if="type === 'withdrawal' && account.address" #token-dropdown-bottom>
            <CommonAlert class="sticky bottom-0 mt-6" variant="neutral" :icon="InformationCircleIcon">
              <p>Only tokens available for withdrawal are displayed</p>
            </CommonAlert>
          </template>
          <template v-if="type === 'withdrawal'" #dropdown>
            <CommonButtonDropdown
              :toggled="fromNetworkModalOpened"
              size="xs"
              variant="light"
              class="overflow-hidden"
              @click="fromNetworkModalOpened = true"
            >
              <template #left-icon>
                <img :src="destinations.era.iconUrl" class="h-full w-full" />
              </template>
              <span class="truncate">{{ destinations.era.label }}</span>
            </CommonButtonDropdown>
          </template>
        </CommonInputTransactionAmount>

        <CommonInputTransactionAddress
          v-if="type === 'withdrawal'"
          v-model="address"
          label="To"
          :default-label="`To your account ${account.address ? shortenAddress(account.address) : ''}`"
          :address-input-hidden="!!tokenCustomBridge"
          class="mt-6"
        >
          <template #dropdown>
            <CommonButtonDropdown
              :toggled="toNetworkModalOpened"
              size="xs"
              variant="light"
              class="overflow-hidden"
              @click="toNetworkModalOpened = true"
            >
              <template #left-icon>
                <img :src="destination.iconUrl" class="h-full w-full" />
              </template>
              <span class="truncate">{{ destination.label }}</span>
            </CommonButtonDropdown>
          </template>
        </CommonInputTransactionAddress>
        <CommonInputTransactionAddress v-else v-model="address" class="mt-6" />
        <TransactionCustomBridge
          v-if="tokenCustomBridge"
          type="withdraw"
          class="mt-6"
          :custom-bridge-token="tokenCustomBridge"
        />
      </template>
      <template v-else-if="step === 'withdrawal-finalization-warning'">
        <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-padding-1/2 sm:mb-block-gap">
          <p v-if="!isCustomNode">
            After a
            <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank"
              >~5+ hour withdrawal delay</a
            >, you will need to manually claim your funds which requires paying another transaction fee on
            {{ eraNetwork.l1Network?.name }}. Alternatively you can use
            <a
              href="https://zksync.dappradar.com/ecosystem?category=defi_bridge"
              target="_blank"
              class="underline underline-offset-2"
              >third-party bridges</a
            >.
          </p>
          <p v-else>
            After transaction is executed on {{ eraNetwork.l1Network?.name }}, you will need to manually claim your
            funds which requires paying another transaction fee on {{ eraNetwork.l1Network?.name }}.
          </p>
        </CommonAlert>
        <CommonButton
          as="a"
          href="https://zksync.dappradar.com/ecosystem?category=defi_bridge"
          target="_blank"
          type="submit"
          variant="primary"
          class="mt-block-gap w-full gap-1"
        >
          See third-party bridges
          <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
        </CommonButton>
        <CommonButton size="sm" class="mx-auto mt-block-gap w-max" @click="buttonContinue()">
          I understand, proceed to withdrawal
        </CommonButton>
      </template>
      <template v-else-if="step === 'confirm'">
        <CommonAlert
          v-if="type === 'withdrawal' && !isCustomNode"
          variant="warning"
          :icon="ExclamationTriangleIcon"
          class="mb-block-padding-1/2 sm:mb-block-gap"
        >
          <p v-if="withdrawalManualFinalizationRequired">
            You will be able to claim your withdrawal only after a 5+ hour withdrawal delay.
            <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank">Learn more</a>
          </p>
          <p v-else>
            You will receive funds only after a 5+ hour withdrawal delay.
            <a class="underline underline-offset-2" :href="ZKSYNC_WITHDRAWAL_DELAY" target="_blank">Learn more</a>
          </p>
        </CommonAlert>

        <CommonCardWithLineButtons>
          <TransactionSummaryTokenEntry label="You send" :token="transaction!.token" />
          <TransactionSummaryAddressEntry
            label="From"
            :address="transaction!.from.address"
            :destination="transaction!.from.destination"
          />
          <TransactionSummaryAddressEntry
            label="To"
            :address="transaction!.to.address"
            :destination="transaction!.to.destination"
          />
        </CommonCardWithLineButtons>

        <CommonErrorBlock v-if="transactionError" :retry-button="false" class="mt-4">
          {{ transactionError.message }}
        </CommonErrorBlock>
      </template>
      <template v-else-if="step === 'submitted'">
        <TransferSubmitted
          v-if="transactionInfo!.type === 'transfer'"
          :transaction="transactionInfo!"
          :make-another-transaction="resetForm"
        />
        <WithdrawalSubmitted
          v-else-if="transactionInfo!.type === 'withdrawal'"
          :transaction="transactionInfo!"
          :make-another-transaction="resetForm"
        />
      </template>

      <template v-if="!tokenCustomBridge && (step === 'form' || step === 'confirm')">
        <CommonErrorBlock v-if="feeError" class="mt-2" @try-again="estimate">
          Fee estimation error: {{ feeError.message }}
        </CommonErrorBlock>
        <div class="mt-4 flex items-center gap-4">
          <transition v-bind="TransitionOpacity()">
            <TransactionFeeDetails
              v-if="!feeError && (fee || feeLoading)"
              label="Fee:"
              :fee-token="feeToken"
              :fee-amount="fee"
              :loading="feeLoading"
            />
          </transition>
          <CommonButtonLabel
            v-if="type === 'withdrawal' && !isCustomNode"
            as="a"
            :href="ZKSYNC_WITHDRAWAL_DELAY"
            target="_blank"
            class="ml-auto text-right"
          >
            5+ hours
          </CommonButtonLabel>
          <CommonButtonLabel v-else-if="type === 'transfer'" as="span" class="ml-auto text-right">
            Almost instant
          </CommonButtonLabel>
        </div>
        <transition v-bind="TransitionAlertScaleInOutTransition">
          <CommonAlert v-if="!enoughBalanceToCoverFee" class="mt-4" variant="error" :icon="ExclamationTriangleIcon">
            <p>
              Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
              {{ destinations.era.label }} to cover the fee
            </p>
            <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
          </CommonAlert>
        </transition>

        <TransactionFooter>
          <template #after-checks>
            <CommonButton
              v-if="step === 'form'"
              type="submit"
              :disabled="continueButtonDisabled"
              variant="primary"
              class="w-full"
              @click="buttonContinue()"
            >
              Continue
            </CommonButton>
            <template v-else-if="step === 'confirm'">
              <transition v-bind="TransitionAlertScaleInOutTransition">
                <div v-if="!enoughBalanceForTransaction" class="mb-4">
                  <CommonAlert variant="error" :icon="ExclamationTriangleIcon">
                    <p>
                      {{
                        selectedToken?.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()
                          ? "The fee has changed since the last estimation. "
                          : ""
                      }}Insufficient <span class="font-medium">{{ selectedToken?.symbol }}</span> balance to pay for
                      transaction. Please go back and adjust the amount to proceed.
                    </p>
                    <button type="button" class="alert-link" @click="step = 'form'">Go back</button>
                  </CommonAlert>
                </div>
              </transition>
              <CommonButton
                :disabled="continueButtonDisabled || transactionStatus !== 'not-started'"
                class="w-full"
                variant="primary"
                @click="buttonContinue()"
              >
                <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                  <span v-if="transactionStatus === 'processing'">Processing...</span>
                  <span v-else-if="transactionStatus === 'waiting-for-signature'">Waiting for confirmation</span>
                  <span v-else>
                    {{ type === "withdrawal" ? "Bridge now" : "Send now" }}
                  </span>
                </transition>
              </CommonButton>
              <TransactionButtonUnderlineConfirmTransaction :opened="transactionStatus === 'waiting-for-signature'" />
            </template>
          </template>
        </TransactionFooter>
      </template>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/vue/24/outline";
import { useRouteQuery } from "@vueuse/router";
import { isAddress } from "ethers";

import { useSentryLogger } from "@/composables/useSentryLogger";
import useFee from "@/composables/zksync/useFee";
import useTransaction, { isWithdrawalManualFinalizationRequired } from "@/composables/zksync/useTransaction";
import { customBridgeTokens } from "@/data/customBridgeTokens";
import { isCustomNode } from "@/data/networks";
import TransferSubmitted from "@/views/transactions/TransferSubmitted.vue";
import WithdrawalSubmitted from "@/views/transactions/WithdrawalSubmitted.vue";

import type { FeeEstimationParams } from "@/composables/zksync/useFee";
import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

const props = defineProps({
  type: {
    type: String as PropType<FeeEstimationParams["type"]>,
    required: true,
  },
});

const route = useRoute();
const router = useRouter();

const onboardStore = useOnboardStore();
const walletStore = useZkSyncWalletStore();
const tokensStore = useZkSyncTokensStore();
const providerStore = useZkSyncProviderStore();
const { account, isConnected } = storeToRefs(onboardStore);
const { eraNetwork } = storeToRefs(providerStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { tokens, tokensRequestInProgress, tokensRequestError } = storeToRefs(tokensStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(walletStore);

const { captureException } = useSentryLogger();

const toNetworkModalOpened = ref(false);
const toNetworkSelected = (networkKey?: string) => {
  if (destinations.value.era.key === networkKey) {
    router.replace({ name: "bridge", query: route.query });
  }
};
const fromNetworkModalOpened = ref(false);
const fromNetworkSelected = (networkKey?: string) => {
  if (destinations.value.ethereum.key === networkKey) {
    router.replace({ name: "bridge", query: route.query });
  }
};

const step = ref<"form" | "withdrawal-finalization-warning" | "confirm" | "submitted">("form");
const destination = computed(() => (props.type === "transfer" ? destinations.value.era : destinations.value.ethereum));

const availableTokens = computed(() => {
  if (!tokens.value) return [];
  if (props.type === "withdrawal") {
    return getTokensWithCustomBridgeTokens(Object.values(tokens.value), AddressChainType.L2).filter((e) => e.l1Address);
  }
  return getTokensWithCustomBridgeTokens(Object.values(tokens.value), AddressChainType.L2);
});
const availableBalances = computed(() => {
  if (props.type === "withdrawal") {
    if (!tokens.value) return [];
    return balance.value.filter((e) => e.l1Address);
  }
  return balance.value;
});
const routeTokenAddress = computed(() => {
  if (!route.query.token || Array.isArray(route.query.token) || !isAddress(route.query.token)) {
    return;
  }
  return checksumAddress(route.query.token);
});
const defaultToken = computed(
  () =>
    availableTokens.value.find((e) => e.address.toUpperCase() === L2_BASE_TOKEN_ADDRESS.toUpperCase()) ??
    availableTokens.value[0] ??
    undefined
);
const selectedTokenAddress = ref<string | undefined>(routeTokenAddress.value ?? defaultToken.value?.address);
const selectedToken = computed<Token | undefined>(() => {
  if (!tokens.value) {
    return undefined;
  }
  return selectedTokenAddress.value
    ? availableTokens.value.find((e) => e.address === selectedTokenAddress.value) ||
        availableBalances.value.find((e) => e.address === selectedTokenAddress.value) ||
        defaultToken.value
    : defaultToken.value;
});
const tokenCustomBridge = computed(() => {
  if (props.type !== "withdrawal" && selectedToken.value) {
    return undefined;
  }
  const customBridgeToken = customBridgeTokens.find(
    (e) => eraNetwork.value.l1Network?.id === e.chainId && e.l1Address === selectedToken.value?.l1Address
  );
  if (!customBridgeToken?.bridges.some((e) => e.withdrawUrl)) {
    return undefined;
  }
  return customBridgeToken;
});
const amountInputTokenAddress = computed({
  get: () => selectedToken.value?.address,
  set: (address) => {
    selectedTokenAddress.value = address;
  },
});
const tokenBalance = computed<BigNumberish | undefined>(() => {
  return balance.value.find((e) => e.address === selectedToken.value?.address)?.amount;
});

const unsubscribe = onboardStore.subscribeOnAccountChange(() => {
  step.value = "form";
});

const {
  gasLimit,
  gasPrice,
  result: fee,
  inProgress: feeInProgress,
  error: feeError,
  feeToken,
  enoughBalanceToCoverFee,
  estimateFee,
  resetFee,
} = useFee(
  computed(() => account.value.address),
  providerStore.requestProvider,
  tokens,
  balance
);

const queryAddress = useRouteQuery<string | undefined>("address", undefined, {
  transform: String,
  mode: "replace",
});
const address = ref((queryAddress.value !== "undefined" && queryAddress.value) || "");
const isAddressInputValid = computed(() => {
  if (address.value) {
    return isAddress(address.value);
  }
  if (props.type === "withdrawal") {
    return true; // Own address by default
  }
  return false;
});
watch(address, (_address) => {
  queryAddress.value = !_address.length ? undefined : _address;
});

const amount = ref("");
const amountError = ref<string | undefined>();
const maxAmount = computed(() => {
  if (!selectedToken.value || !tokenBalance.value) {
    return undefined;
  }
  if (feeToken.value?.address === selectedToken.value.address) {
    if (BigInt(tokenBalance.value) === 0n) {
      return "0";
    }
    if (!fee.value) {
      return undefined;
    }
    if (BigInt(fee.value) > BigInt(tokenBalance.value)) {
      return "0";
    }
    return String(BigInt(tokenBalance.value) - BigInt(fee.value));
  }
  return tokenBalance.value.toString();
});
const totalComputeAmount = computed(() => {
  try {
    if (!amount.value || !selectedToken.value) {
      return 0n;
    }
    return decimalToBigNumber(amount.value, selectedToken.value.decimals);
  } catch (error) {
    captureException({
      error: error as Error,
      parentFunctionName: "totalComputeAmount",
      parentFunctionParams: [],
      filePath: "views/transactions/Transfer.vue",
    });
    return 0n;
  }
});
const enoughBalanceForTransaction = computed(() => {
  if (!fee.value || !selectedToken.value || !tokenBalance.value) {
    return true;
  }
  const totalToPay =
    totalComputeAmount.value + (selectedToken.value.address === feeToken.value?.address ? BigInt(fee.value) : 0n);
  return BigInt(tokenBalance.value) >= totalToPay;
});

const transaction = computed<
  | {
      type: FeeEstimationParams["type"];
      token: TokenAmount;
      from: { address: string; destination: TransactionDestination };
      to: { address: string; destination: TransactionDestination };
    }
  | undefined
>(() => {
  const toAddress = isAddress(address.value) ? address.value : account.value.address;
  if (!toAddress || !selectedToken.value) {
    return undefined;
  }
  return {
    type: props.type,
    token: {
      ...selectedToken.value!,
      amount: totalComputeAmount.value.toString(),
    },
    from: {
      address: account.value.address!,
      destination: destinations.value.era,
    },
    to: {
      address: toAddress,
      destination: destination.value,
    },
  };
});

const withdrawalManualFinalizationRequired = computed(() => {
  if (!transaction.value) return false;
  return (
    props.type === "withdrawal" &&
    isWithdrawalManualFinalizationRequired(transaction.value.token, eraNetwork.value.l1Network?.id || -1)
  );
});

const feeLoading = computed(() => feeInProgress.value || (!fee.value && balanceInProgress.value));
const estimate = async () => {
  // estimation fails when token balance is 0
  if (
    !transaction.value?.from.address ||
    !transaction.value?.to.address ||
    !selectedToken.value ||
    !tokenBalance.value
  ) {
    return;
  }
  await estimateFee({
    type: props.type,
    from: transaction.value.from.address,
    to: transaction.value.to.address,
    tokenAddress: selectedToken.value.address,
  });
};
watch(
  [() => selectedToken.value?.address, () => tokenBalance.value?.toString()],
  () => {
    resetFee();
    estimate();
  },
  { immediate: true }
);

const autoUpdatingFee = computed(() => !feeError.value && fee.value && !feeLoading.value);
const { reset: resetAutoUpdateEstimate, stop: stopAutoUpdateEstimate } = useInterval(async () => {
  if (!autoUpdatingFee.value) return;
  await estimate();
}, 60000);
watch(
  autoUpdatingFee,
  (updatingFee) => {
    if (!updatingFee) {
      stopAutoUpdateEstimate();
    } else {
      resetAutoUpdateEstimate();
    }
  },
  { immediate: true }
);

const continueButtonDisabled = computed(() => {
  if (
    !isAddressInputValid.value ||
    !transaction.value ||
    !enoughBalanceToCoverFee.value ||
    !enoughBalanceForTransaction.value ||
    !!amountError.value ||
    BigInt(transaction.value.token.amount) === 0n
  ) {
    return true;
  }
  if (feeLoading.value || !fee.value) return true;
  return false;
});
const buttonContinue = () => {
  if (continueButtonDisabled.value) {
    return;
  }
  if (step.value === "form") {
    if (withdrawalManualFinalizationRequired.value) {
      step.value = "withdrawal-finalization-warning";
    } else {
      step.value = "confirm";
    }
  } else if (step.value === "withdrawal-finalization-warning") {
    step.value = "confirm";
  } else if (step.value === "confirm") {
    makeTransaction();
  }
};

/* Transaction signing and submitting */
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const { previousTransactionAddress } = storeToRefs(usePreferencesStore());
const {
  status: transactionStatus,
  error: transactionError,
  commitTransaction,
} = useTransaction(walletStore.getSigner, providerStore.requestProvider);
const { saveTransaction, waitForCompletion } = useZkSyncTransactionStatusStore();

watch(step, (newStep) => {
  if (newStep === "form") {
    transactionError.value = undefined;
  }
});

const transactionInfo = ref<TransactionInfo | undefined>();
const makeTransaction = async () => {
  if (continueButtonDisabled.value) return;

  const tx = await commitTransaction(
    {
      type: props.type,
      to: transaction.value!.to.address,
      tokenAddress: transaction.value!.token.address,
      amount: transaction.value!.token.amount,
      bridgeAddress: transaction.value!.token.l2BridgeAddress,
    },
    {
      gasLimit: gasLimit.value!,
      gasPrice: gasPrice.value!,
    }
  );

  if (transactionStatus.value === "done") {
    step.value = "submitted";
    previousTransactionAddress.value = transaction.value!.to.address;
  }

  if (tx) {
    const fee = calculateFee(BigInt(gasLimit.value!), BigInt(gasPrice.value!));
    walletStore.deductBalance(feeToken.value!.address, fee);
    walletStore.deductBalance(transaction.value!.token.address, transaction.value!.token.amount);
    transactionInfo.value = {
      type: transaction.value!.type,
      transactionHash: tx.hash,
      timestamp: new Date().toISOString(),
      token: transaction.value!.token,
      from: transaction.value!.from,
      to: transaction.value!.to,
      info: {
        expectedCompleteTimestamp:
          transaction.value?.type === "withdrawal"
            ? new Date(new Date().getTime() + WITHDRAWAL_DELAY).toISOString()
            : undefined,
        completed: false,
      },
    };
    saveTransaction(transactionInfo.value);
    silentRouterChange(
      router.resolve({
        name: "transaction-hash",
        params: { hash: transactionInfo.value.transactionHash },
        query: { network: eraNetwork.value.key },
      }).href
    );
    waitForCompletion(transactionInfo.value)
      .then((completedTransaction) => {
        transactionInfo.value = completedTransaction;
        trackEvent(transaction.value!.type, {
          token: transaction.value!.token.symbol,
          amount: transaction.value!.token.amount,
          to: transaction.value!.to.address,
        });
        setTimeout(() => {
          transfersHistoryStore.reloadRecentTransfers().catch(() => undefined);
          walletStore.requestBalance({ force: true }).catch(() => undefined);
        }, 2000);
      })
      .catch((err) => {
        transactionError.value = err as Error;
        transactionStatus.value = "not-started";
      });
  }
};

const resetForm = () => {
  address.value = "";
  amount.value = "";
  step.value = "form";
  transactionStatus.value = "not-started";
  transactionInfo.value = undefined;
  silentRouterChange((route as unknown as { href: string }).href);
};

const fetchBalances = async (force = false) => {
  tokensStore.requestTokens();
  if (!isConnected.value) return;

  await walletStore.requestBalance({ force });
};
fetchBalances();

const unsubscribeFetchBalance = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  fetchBalances();
  resetFee();
  estimate();
});

onBeforeUnmount(() => {
  unsubscribe();
  unsubscribeFetchBalance();
});
</script>

<style lang="scss" scoped></style>
