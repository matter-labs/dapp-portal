<template>
  <div>
    <NetworkDeprecationAlert v-if="step === 'form'" />
    <PageTitle v-if="step === 'form'">Bridge</PageTitle>
    <PageTitle v-else-if="step === 'wallet-warning'">Wallet warning</PageTitle>
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
      :network-key="destinations.ethereum.key"
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
        <EcosystemBlock
          v-if="eraNetwork.displaySettings?.showPartnerLinks && ecosystemBannerVisible"
          show-close-button
          class="mb-block-padding-1/2 sm:mb-block-gap"
        />
        <CommonInputTransactionAmount
          v-model="amount"
          v-model:error="amountError"
          v-model:token-address="amountInputTokenAddress"
          label="From"
          :tokens="availableTokens"
          :balances="availableBalances"
          :max-amount="maxAmount"
          :approve-required="!enoughAllowance && (!tokenCustomBridge || !tokenCustomBridge.bridgingDisabled)"
          :loading="tokensRequestInProgress || balanceInProgress || feeLoading"
          class="mb-block-padding-1/2 sm:mb-block-gap"
        >
          <template #dropdown>
            <CommonButtonDropdown
              :toggled="fromNetworkModalOpened"
              size="xs"
              variant="light"
              @click="fromNetworkModalOpened = true"
            >
              <template #left-icon>
                <img :src="destinations.ethereum.iconUrl" class="h-full w-full" />
              </template>
              <span>{{ destinations.ethereum.label }}</span>
            </CommonButtonDropdown>
          </template>
        </CommonInputTransactionAmount>
        <CommonHeightTransition :opened="!!tokenCustomBridge && !tokenCustomBridge.bridgingDisabled">
          <div class="mb-block-padding-1/2 sm:mb-block-gap">
            <CommonAlert variant="warning" size="sm">
              <p>
                Bridged {{ tokenCustomBridge?.symbol }} ({{ tokenCustomBridge?.bridgedSymbol }}) will work but is
                different from native {{ tokenCustomBridge?.symbol }}.
              </p>
              <a
                v-if="tokenCustomBridge?.learnMoreUrl"
                class="underline underline-offset-2"
                target="_blank"
                :href="tokenCustomBridge.learnMoreUrl"
              >
                Learn more
              </a>
            </CommonAlert>
          </div>
        </CommonHeightTransition>
        <CommonInputTransactionAddress
          v-model="address"
          label="To"
          :default-label="`To your account ${account.address ? shortenAddress(account.address) : ''}`"
          :address-input-hidden="tokenCustomBridge?.bridgingDisabled"
        >
          <template #dropdown>
            <CommonButtonDropdown
              :toggled="toNetworkModalOpened"
              size="xs"
              variant="light"
              @click="toNetworkModalOpened = true"
            >
              <template #left-icon>
                <img :src="destination.iconUrl" class="h-full w-full" />
              </template>
              <span>{{ destination.label }}</span>
            </CommonButtonDropdown>
          </template>
        </CommonInputTransactionAddress>
        <TransactionCustomBridge
          v-if="tokenCustomBridge?.bridgingDisabled"
          type="deposit"
          class="mt-6"
          :custom-bridge-token="tokenCustomBridge"
        />
      </template>
      <template v-else-if="step === 'wallet-warning'">
        <CommonAlert variant="warning" :icon="ExclamationTriangleIcon" class="mb-block-padding-1/2 sm:mb-block-gap">
          <p>
            Make sure your wallet supports {{ eraNetwork.name }} network before adding funds to your account. Otherwise,
            this can result in <span class="font-medium text-red-600">loss of funds</span>. See the list of supported
            wallets on the
            <a
              class="underline underline-offset-2"
              href="https://zksync.dappradar.com/ecosystem?category=non_dapps_wallets"
              target="_blank"
              >Ecosystem</a
            >
            website.
          </p>
        </CommonAlert>
        <CommonButton type="submit" variant="primary" class="mt-block-gap w-full gap-1" @click="buttonContinue()">
          I understand, proceed to bridge
        </CommonButton>
        <CommonButton size="sm" class="mx-auto mt-block-gap w-max" @click="disableWalletWarning()">
          Don't show again
        </CommonButton>
      </template>
      <template v-else-if="step === 'confirm'">
        <CommonCardWithLineButtons>
          <TransactionSummaryTokenEntry label="You bridge" :token="transaction!.token" />
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
        <DepositSubmitted :transaction="transactionInfo!" :make-another-transaction="resetForm" />
      </template>

      <template
        v-if="(!tokenCustomBridge || !tokenCustomBridge?.bridgingDisabled) && (step === 'form' || step === 'confirm')"
      >
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
          <CommonButtonLabel v-if="!isCustomNode" as="span" class="ml-auto text-right">~15 minutes</CommonButtonLabel>
        </div>
        <transition v-bind="TransitionAlertScaleInOutTransition" mode="out-in">
          <CommonAlert
            v-if="recommendedBalance && feeToken"
            class="mt-4"
            variant="error"
            :icon="ExclamationTriangleIcon"
          >
            <p>
              Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
              {{ destinations.ethereum.label }} to cover the fee. We recommend having at least
              <span class="font-medium"
                >{{
                  feeToken?.price
                    ? removeSmallAmountPretty(recommendedBalance, feeToken?.decimals, feeToken?.price)
                    : parseTokenAmount(recommendedBalance, feeToken?.decimals || 18)
                }}
                {{ feeToken?.symbol }}</span
              >
              on {{ eraNetwork.l1Network?.name ?? "L1" }} for deposit.
            </p>
            <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
          </CommonAlert>
          <CommonAlert
            v-else-if="!enoughBalanceToCoverFee"
            class="mt-4"
            variant="error"
            :icon="ExclamationTriangleIcon"
          >
            <p>
              Insufficient <span class="font-medium">{{ feeToken?.symbol }}</span> balance on
              <span class="font-medium">{{ destinations.ethereum.label }}</span> to cover the fee
            </p>
            <NuxtLink :to="{ name: 'receive-methods' }" class="alert-link">Receive funds</NuxtLink>
          </CommonAlert>
        </transition>
        <CommonErrorBlock v-if="allowanceRequestError" class="mt-2" @try-again="requestAllowance">
          Checking allowance error: {{ allowanceRequestError.message }}
        </CommonErrorBlock>
        <CommonErrorBlock v-else-if="setAllowanceError" class="mt-2" @try-again="setTokenAllowance">
          Allowance approval error: {{ setAllowanceError.message }}
        </CommonErrorBlock>
        <CommonHeightTransition
          v-if="step === 'form'"
          :opened="(!enoughAllowance && !continueButtonDisabled) || !!setAllowanceReceipts?.length"
        >
          <CommonCardWithLineButtons class="mt-4">
            <DestinationItem
              v-if="enoughAllowance && setAllowanceReceipts?.length"
              as="div"
              :description="`You can now proceed to deposit`"
            >
              <template #label>
                {{ selectedToken?.symbol }} allowance approved
                <template v-for="allowanceReceipt in setAllowanceReceipts" :key="allowanceReceipt.transactionHash">
                  <a
                    v-if="l1BlockExplorerUrl"
                    :href="`${l1BlockExplorerUrl}/tx/${allowanceReceipt.transactionHash}`"
                    target="_blank"
                    class="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    View on Explorer
                    <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
                  </a>
                </template>
              </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-success-400 p-3 text-black">
                  <CheckIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
            <DestinationItem v-else as="div">
              <template #label>
                Approve {{ selectedToken?.symbol }} allowance
                <template
                  v-for="allowanceTransactionHash in setAllowanceTransactionHashes"
                  :key="allowanceTransactionHash"
                >
                  <a
                    v-if="l1BlockExplorerUrl && allowanceTransactionHash"
                    :href="`${l1BlockExplorerUrl}/tx/${allowanceTransactionHash}`"
                    target="_blank"
                    class="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    View on Explorer
                    <ArrowTopRightOnSquareIcon class="h-6 w-6" aria-hidden="true" />
                  </a>
                </template>
              </template>
              <template #underline>
                Before depositing you need to give our bridge permission to spend specified amount of
                {{ selectedToken?.symbol }}.
                <span v-if="allowance && allowance !== 0n"
                  >You can deposit up to
                  <CommonButtonLabel variant="light" @click="setAmountToCurrentAllowance()">
                    {{ parseTokenAmount(allowance!, selectedToken!.decimals) }}
                  </CommonButtonLabel>
                  {{ selectedToken!.symbol }} without approving a new allowance.
                </span>
                <CommonButtonLabel variant="light" as="a" :href="TOKEN_ALLOWANCE" target="_blank">
                  Learn more
                </CommonButtonLabel>
              </template>
              <template #image>
                <div class="aspect-square h-full w-full rounded-full bg-warning-400 p-3 text-black">
                  <LockClosedIcon aria-hidden="true" />
                </div>
              </template>
            </DestinationItem>
          </CommonCardWithLineButtons>
        </CommonHeightTransition>

        <EthereumTransactionFooter>
          <template #after-checks>
            <template v-if="step === 'form'">
              <template v-if="!enoughAllowance && !continueButtonDisabled">
                <CommonButton
                  type="submit"
                  :disabled="continueButtonDisabled || setAllowanceInProgress"
                  variant="primary"
                  class="w-full"
                  @click="setTokenAllowance()"
                >
                  <transition v-bind="TransitionPrimaryButtonText" mode="out-in">
                    <span v-if="setAllowanceStatus === 'processing'">Processing...</span>
                    <span v-else-if="setAllowanceStatus === 'waiting-for-signature'"
                      >Waiting for allowance approval confirmation</span
                    >
                    <span v-else-if="setAllowanceStatus === 'sending'" class="flex items-center">
                      <CommonSpinner class="mr-2 h-6 w-6" />
                      Approving allowance...
                    </span>
                    <span v-else>Approve {{ selectedToken?.symbol }} allowance</span>
                  </transition>
                </CommonButton>
                <TransactionButtonUnderlineConfirmTransaction
                  :opened="setAllowanceStatus === 'waiting-for-signature'"
                />
              </template>
              <CommonButton
                v-else
                type="submit"
                :disabled="continueButtonDisabled"
                variant="primary"
                class="w-full"
                @click="buttonContinue()"
              >
                Continue
              </CommonButton>
            </template>
            <template v-else-if="step === 'confirm'">
              <transition v-bind="TransitionAlertScaleInOutTransition">
                <div v-if="!enoughBalanceForTransaction" class="mb-4">
                  <CommonAlert
                    v-if="amountError === 'exceeds_max_amount'"
                    variant="error"
                    :icon="ExclamationTriangleIcon"
                  >
                    <p>
                      The inputted amount is higher than the recommended maximum amount. This means your transaction
                      might fail.
                    </p>
                    <button type="button" class="alert-link" @click="step = 'form'">Go back</button>
                  </CommonAlert>
                  <CommonAlert v-else-if="continueButtonDisabled" variant="error" :icon="ExclamationTriangleIcon">
                    <p>
                      The fee has changed since the last estimation. Insufficient
                      <span class="font-medium">{{ selectedToken?.symbol }}</span> balance to pay for transaction.
                      Please go back and adjust the amount to proceed.
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
                  <span v-else>Bridge now</span>
                </transition>
              </CommonButton>
              <TransactionButtonUnderlineConfirmTransaction :opened="transactionStatus === 'waiting-for-signature'" />
            </template>
          </template>
        </EthereumTransactionFooter>
      </template>
    </form>
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
} from "@heroicons/vue/24/outline";
import { computedAsync } from "@vueuse/core";
import { useRouteQuery } from "@vueuse/router";
import { isAddress } from "ethers";

import EthereumTransactionFooter from "@/components/transaction/EthereumTransactionFooter.vue";
import useAllowance from "@/composables/transaction/useAllowance";
import { useSentryLogger } from "@/composables/useSentryLogger";
import useEcosystemBanner from "@/composables/zksync/deposit/useEcosystemBanner";
import useFee from "@/composables/zksync/deposit/useFee";
import useTransaction from "@/composables/zksync/deposit/useTransaction";
import { customBridgeTokens } from "@/data/customBridgeTokens";
import { isCustomNode } from "@/data/networks";
import DepositSubmitted from "@/views/transactions/DepositSubmitted.vue";

import type { Token, TokenAmount } from "@/types";
import type { BigNumberish } from "ethers";

const route = useRoute();
const router = useRouter();

const onboardStore = useOnboardStore();
const tokensStore = useZkSyncTokensStore();
const providerStore = useZkSyncProviderStore();
const zkSyncEthereumBalance = useZkSyncEthereumBalanceStore();
const eraWalletStore = useZkSyncWalletStore();
const { account, isConnected, walletNotSupported, walletWarningDisabled } = storeToRefs(onboardStore);
const { eraNetwork } = storeToRefs(providerStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { l1BlockExplorerUrl } = storeToRefs(useNetworkStore());
const { l1Tokens, baseToken, tokensRequestInProgress, tokensRequestError } = storeToRefs(tokensStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(zkSyncEthereumBalance);

const { captureException } = useSentryLogger();

const toNetworkModalOpened = ref(false);
const toNetworkSelected = (networkKey?: string) => {
  if (destinations.value.ethereum.key === networkKey) {
    router.replace({ name: "bridge-withdraw", query: route.query });
  }
};
const fromNetworkModalOpened = ref(false);
const fromNetworkSelected = (networkKey?: string) => {
  if (destinations.value.era.key === networkKey) {
    router.replace({ name: "bridge-withdraw", query: route.query });
  }
};

const step = ref<"form" | "wallet-warning" | "confirm" | "submitted">("form");
const destination = computed(() => destinations.value.era);

const availableTokens = computed<Token[]>(() => {
  if (balance.value) return balance.value;
  return Object.values(l1Tokens.value ?? []);
});
const availableBalances = computed<TokenAmount[]>(() => {
  return balance.value ?? [];
});
const routeTokenAddress = computed(() => {
  if (!route.query.token || Array.isArray(route.query.token) || !isAddress(route.query.token)) {
    return;
  }
  return checksumAddress(route.query.token);
});
const defaultToken = computed(
  () =>
    availableTokens.value.find((e) => e.address === baseToken.value?.l1Address) ?? availableTokens.value[0] ?? undefined
);
const selectedTokenAddress = ref<string | undefined>(routeTokenAddress.value ?? defaultToken.value?.address);
const selectedToken = computed<Token | undefined>(() => {
  if (!selectedTokenAddress.value) {
    return defaultToken.value;
  }
  return (
    availableTokens.value.find((e) => e.address === selectedTokenAddress.value) ||
    availableBalances.value.find((e) => e.address === selectedTokenAddress.value) ||
    defaultToken.value
  );
});
const tokenCustomBridge = computed(() => {
  if (!selectedToken.value) {
    return undefined;
  }
  const customBridgeToken = customBridgeTokens.find(
    (e) => eraNetwork.value.l1Network?.id === e.chainId && e.l1Address === selectedToken.value?.address
  );
  return customBridgeToken;
});
const amountInputTokenAddress = computed({
  get: () => selectedToken.value?.address,
  set: (address) => {
    selectedTokenAddress.value = address;
  },
});
const tokenBalance = computed<BigNumberish | undefined>(() => {
  return balance.value?.find((e) => e.address === selectedToken.value?.address)?.amount;
});

const {
  result: allowance,
  inProgress: allowanceRequestInProgress,
  error: allowanceRequestError,
  requestAllowance,

  setAllowanceTransactionHashes,
  setAllowanceReceipts,
  setAllowanceStatus,
  setAllowanceInProgress,
  setAllowanceError,
  setAllowance,
  resetSetAllowance,
  getApprovalAmounts,
} = useAllowance(
  computed(() => account.value.address),
  computed(() => selectedToken.value?.address),
  async () => (await providerStore.requestProvider().getDefaultBridgeAddresses()).sharedL1,
  eraWalletStore.getL1Signer
);
const enoughAllowance = computedAsync(async () => {
  if (allowance?.value === undefined || !selectedToken.value) {
    return true;
  }

  const approvalAmounts = await getApprovalAmounts(totalComputeAmount.value, feeValues.value!);
  const approvalAllowance = approvalAmounts.length ? approvalAmounts[0]?.allowance : 0;
  return allowance.value !== 0n && allowance?.value >= BigInt(approvalAllowance);
}, false);
const setAmountToCurrentAllowance = () => {
  if (!allowance.value || !selectedToken.value) {
    return;
  }
  amount.value = parseTokenAmount(allowance.value, selectedToken.value.decimals);
};
const setTokenAllowance = async () => {
  await setAllowance(totalComputeAmount.value, feeValues.value!);
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for balances to be updated on API side
  await fetchBalances(true);
};

const unsubscribe = onboardStore.subscribeOnAccountChange(() => {
  step.value = "form";
});

const {
  fee: feeValues,
  result: fee,
  inProgress: feeInProgress,
  error: feeError,
  recommendedBalance,
  feeToken,
  enoughBalanceToCoverFee,
  estimateFee,
  resetFee,
} = useFee(availableTokens, balance);

const queryAddress = useRouteQuery<string | undefined>("address", undefined, {
  transform: String,
  mode: "replace",
});
const address = ref((queryAddress.value !== "undefined" && queryAddress.value) || "");
const isAddressInputValid = computed(() => {
  if (address.value) {
    return isAddress(address.value);
  }
  return true; // Own address by default
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
      filePath: "views/transactions/Deposit.vue",
    });
    return 0n;
  }
});
const enoughBalanceForTransaction = computed(() => !amountError.value);

const transaction = computed<
  | {
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
    token: {
      ...selectedToken.value!,
      amount: totalComputeAmount.value.toString(),
    },
    from: {
      address: account.value.address!,
      destination: destinations.value.ethereum,
    },
    to: {
      address: toAddress,
      destination: destination.value,
    },
  };
});

const feeLoading = computed(() => feeInProgress.value || (!fee.value && balanceInProgress.value));
const estimate = async () => {
  if (!transaction.value?.from.address || !transaction.value?.to.address || !selectedToken.value) {
    return;
  }
  await estimateFee(transaction.value.to.address, selectedToken.value.address);
};
watch(
  [() => selectedToken.value?.address, () => transaction.value?.from.address],
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
    !transaction.value ||
    !enoughBalanceToCoverFee.value ||
    !(!amountError.value || amountError.value === "exceeds_max_amount") ||
    BigInt(transaction.value.token.amount) === 0n
  )
    return true;
  if ((allowanceRequestInProgress.value && !allowance.value) || allowanceRequestError.value) return true;
  if (!enoughAllowance.value) return false; // When allowance approval is required we can proceed to approve stage even if deposit fee is not loaded
  if (!isAddressInputValid.value) return true;
  if (feeLoading.value || !fee.value) return true;
  return false;
});

const buttonContinue = () => {
  if (continueButtonDisabled.value) {
    return;
  }
  if (step.value === "form") {
    if (walletNotSupported.value) {
      step.value = "wallet-warning";
    } else {
      step.value = "confirm";
    }
  } else if (step.value === "wallet-warning") {
    step.value = "confirm";
  } else if (step.value === "confirm") {
    makeTransaction();
  }
};
const disableWalletWarning = () => {
  walletWarningDisabled.value = true;
  step.value = "confirm";
};

/* Transaction signing and submitting */
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const { previousTransactionAddress } = storeToRefs(usePreferencesStore());
const {
  status: transactionStatus,
  error: transactionError,
  commitTransaction,
} = useTransaction(eraWalletStore.getL1Signer);
const { recentlyBridged, ecosystemBannerVisible } = useEcosystemBanner();
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
      to: transaction.value!.to.address,
      tokenAddress: transaction.value!.token.address,
      amount: transaction.value!.token.amount,
    },
    feeValues.value!
  );

  if (transactionStatus.value === "done") {
    step.value = "submitted";
    previousTransactionAddress.value = transaction.value!.to.address;
    recentlyBridged.value = true;
  }

  if (tx) {
    zkSyncEthereumBalance.deductBalance(feeToken.value!.address!, fee.value!);
    zkSyncEthereumBalance.deductBalance(transaction.value!.token.address!, String(transaction.value!.token.amount));
    transactionInfo.value = {
      type: "deposit",
      transactionHash: tx.hash,
      timestamp: new Date().toISOString(),
      token: transaction.value!.token,
      from: transaction.value!.from,
      to: transaction.value!.to,
      info: {
        expectedCompleteTimestamp: new Date(new Date().getTime() + ESTIMATED_DEPOSIT_DELAY).toISOString(),
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
        trackEvent("deposit", {
          token: transaction.value!.token.symbol,
          amount: transaction.value!.token.amount,
          to: transaction.value!.to.address,
        });
        setTimeout(() => {
          transfersHistoryStore.reloadRecentTransfers().catch(() => undefined);
          eraWalletStore.requestBalance({ force: true }).catch(() => undefined);
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
  resetSetAllowance();
  requestAllowance();
  silentRouterChange((route as unknown as { href: string }).href);
};

const fetchBalances = async (force = false) => {
  tokensStore.requestTokens();
  if (!isConnected.value) return;

  await zkSyncEthereumBalance.requestBalance({ force });
};
fetchBalances();

const unsubscribeFetchBalance = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  fetchBalances();
});

onBeforeUnmount(() => {
  unsubscribe();
  unsubscribeFetchBalance();
});
</script>

<style lang="scss" scoped></style>
