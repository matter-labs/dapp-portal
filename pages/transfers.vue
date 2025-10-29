<template>
  <div>
    <NetworkDeprecationAlert />
    <PageTitle>{{ $t("common.transfers") }}</PageTitle>

    <template v-if="!isConnected">
      <ConnectWalletBlock>{{ $t("transfers.connectToView", { network: eraNetwork.name }) }}</ConnectWalletBlock>
    </template>
    <template v-else>
      <template v-if="!loading && recentBridgeOperations.length">
        <TypographyCategoryLabel>{{ $t("transfers.recentBridgeOperations") }}</TypographyCategoryLabel>
        <div v-if="actionRequiredBridgeTransactions.length" class="space-y-block-gap">
          <CommonCardWithLineButtons v-for="(item, index) in actionRequiredBridgeTransactions" :key="index">
            <TransactionTransferWithdrawalLineItem
              :transfer="item"
              :in-progress="!item.completed"
              as="RouterLink"
              :to="{
                name: 'transaction-hash',
                params: { hash: item.identifierTransactionHash },
                query: { network: eraNetwork.key },
              }"
            />
          </CommonCardWithLineButtons>
        </div>

        <CommonCardWithLineButtons
          v-if="actionNotRequiredBridgeTransactions.length"
          :class="{ 'mt-block-gap': actionRequiredBridgeTransactions.length }"
        >
          <TransactionTransferLineItem
            v-for="(item, index) in actionNotRequiredBridgeTransactions"
            :key="index"
            :transfer="item"
            :in-progress="!item.completed"
            as="RouterLink"
            :to="{
              name: 'transaction-hash',
              params: { hash: item.identifierTransactionHash },
              query: { network: eraNetwork.key },
            }"
          />
        </CommonCardWithLineButtons>

        <TypographyCategoryLabel v-if="!hasOnlyRecentBridgeOperations">{{
          $t("transfers.completedTransfers")
        }}</TypographyCategoryLabel>
      </template>

      <div v-if="loading">
        <CommonCardWithLineButtons>
          <TokenBalanceLoader v-for="index in 5" :key="index" />
        </CommonCardWithLineButtons>
      </div>
      <CommonCardWithLineButtons v-else-if="recentTransfersRequestError">
        <CommonErrorBlock @try-again="fetch">
          Loading transfers error: {{ recentTransfersRequestError.message }}
        </CommonErrorBlock>
      </CommonCardWithLineButtons>
      <div v-else-if="displayedTransfers.length">
        <CommonCardWithLineButtons>
          <TransactionTransferLineItem v-for="(item, index) in displayedTransfers" :key="index" :transfer="item" />
          <template v-if="canLoadMore && previousTransfersRequestInProgress">
            <TokenBalanceLoader v-for="index in 5" :key="index" />
          </template>
        </CommonCardWithLineButtons>

        <!-- Load more -->
        <template v-if="canLoadMore && !previousTransfersRequestInProgress">
          <CommonCardWithLineButtons v-if="previousTransfersRequestError">
            <CommonErrorBlock @try-again="fetchMore">
              Loading transfers error: {{ previousTransfersRequestError.message }}
            </CommonErrorBlock>
          </CommonCardWithLineButtons>
          <CommonButton v-else ref="loadMoreEl" variant="primary" class="mx-auto mt-4">Load more</CommonButton>
        </template>
      </div>
      <CommonCardWithLineButtons v-else-if="!hasOnlyRecentBridgeOperations">
        <CommonEmptyBlock>
          At the moment you don't have any transfers on
          <span class="font-medium">{{ destinations.era.label }}</span>
        </CommonEmptyBlock>
      </CommonCardWithLineButtons>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { useIntersectionObserver } from "@vueuse/core";

const onboardStore = useOnboardStore();
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());
const transfersHistoryStore = useZkSyncTransfersHistoryStore();
const { isConnected } = storeToRefs(onboardStore);
const {
  transfers,
  recentTransfersRequestInProgress,
  recentTransfersRequestError,
  canLoadMore,
  previousTransfersRequestInProgress,
  previousTransfersRequestError,
} = storeToRefs(transfersHistoryStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { userTransactions } = storeToRefs(useZkSyncTransactionStatusStore());

type RecentBridgeOperation = Transfer & {
  identifierTransactionHash: string;
  completed: boolean;
  finalizationAvailable?: boolean;
};
const recentBridgeOperations = computed<RecentBridgeOperation[]>(() => {
  const recent = userTransactions.value.filter(
    (tx) =>
      (tx.type === "withdrawal" &&
        (!tx.info.completed || new Date(tx.timestamp).getTime() + WITHDRAWAL_DELAY * 2 > new Date().getTime())) ||
      (tx.type === "deposit" && new Date(tx.timestamp).getTime() + ESTIMATED_DEPOSIT_DELAY * 2 > new Date().getTime())
  );

  return [
    ...recent.map((tx) => {
      return {
        transactionHash: tx.type === "deposit" ? tx.info.toTransactionHash || null : tx.transactionHash,
        identifierTransactionHash: tx.transactionHash,
        type: tx.type,
        from: tx.from.address,
        to: tx.to.address,
        fromNetwork: tx.type === "deposit" ? "L1" : "L2",
        toNetwork: tx.type === "deposit" ? "L2" : "L1",
        amount: tx.token.amount,
        token: tx.token,
        timestamp: tx.timestamp,
        completed: tx.info.completed,
        finalizationAvailable:
          tx.type === "withdrawal" ? !tx.info.completed && tx.info.withdrawalFinalizationAvailable : undefined,
      } as RecentBridgeOperation;
    }),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
});
const actionRequiredBridgeTransactions = computed(() =>
  recentBridgeOperations.value.filter((e) => e.finalizationAvailable)
);
const actionNotRequiredBridgeTransactions = computed(() => {
  const actionRequiredHashes = actionRequiredBridgeTransactions.value.map((e) => e.transactionHash);
  return recentBridgeOperations.value.filter((e) => !actionRequiredHashes.includes(e.transactionHash));
});

const displayedTransfers = computed(() => {
  return transfers.value.filter(
    (transfer) => !recentBridgeOperations.value.find((tx) => tx.transactionHash === transfer.transactionHash)
  );
});
const hasOnlyRecentBridgeOperations = computed(() => {
  return !displayedTransfers.value.length && recentBridgeOperations.value.length && !recentTransfersRequestError.value;
});
const { loading, reset: resetSingleLoading } = useSingleLoading(recentTransfersRequestInProgress);

const fetch = () => {
  if (!isConnected.value) return;
  transfersHistoryStore.requestRecentTransfers();
};
fetch();

const unsubscribe = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  resetSingleLoading();
  fetch();
});

const loadMoreEl = ref(null);
const fetchMore = () => {
  transfersHistoryStore.requestPreviousTransfers();
};
const { stop: stopLoadMoreObserver } = useIntersectionObserver(loadMoreEl, ([{ isIntersecting }]) => {
  if (isIntersecting) {
    fetchMore();
  }
});

onBeforeUnmount(() => {
  unsubscribe();
  stopLoadMoreObserver();
});
</script>

<style lang="scss" scoped></style>
