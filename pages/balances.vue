<template>
  <div>
    <PageTitle :fallback-route="{ name: 'assets' }">{{ $t("common.balances") }}</PageTitle>

    <template v-if="!isConnected">
      <ConnectWalletBlock>{{ $t("assets.connectToView", { network: eraNetwork.name }) }}</ConnectWalletBlock>
    </template>
    <template v-else>
      <CommonCardWithLineButtons v-if="loading">
        <TokenBalanceLoader v-for="index in 2" :key="index" send-route-name />
      </CommonCardWithLineButtons>
      <CommonCardWithLineButtons v-else-if="balanceError">
        <CommonErrorBlock @try-again="fetch">
          {{ balanceError.message }}
        </CommonErrorBlock>
      </CommonCardWithLineButtons>
      <div v-else class="space-y-4">
        <CommonInputSearch
          v-model.trim="search"
          class="mb-block-padding-1/4"
          :placeholder="$t('tokenSelect.symbolOrAddress')"
          autofocus="desktop"
        >
          <template #icon>
            <MagnifyingGlassIcon aria-hidden="true" />
          </template>
        </CommonInputSearch>

        <div v-for="(group, index) in filteredBalances" :key="index">
          <TypographyCategoryLabel v-if="group.title"> {{ group.title }} </TypographyCategoryLabel>
          <CommonCardWithLineButtons>
            <TokenBalance
              v-for="item in group.balances"
              :key="item.address"
              as="div"
              :send-route-name="
                item.amount === '0' ? 'receive-methods' : eraNetwork.l1Network ? 'send-methods' : 'send'
              "
              v-bind="item"
            />
          </CommonCardWithLineButtons>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { TokenAmount } from "@/types";

const onboardStore = useOnboardStore();
const walletEraStore = useZkSyncWalletStore();
const { isConnected } = storeToRefs(onboardStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(walletEraStore);
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());

const { loading, reset: resetSingleLoading } = useSingleLoading(computed(() => balanceInProgress.value));

const search = ref("");
const balanceGroups = groupBalancesByAmount(balance);

const filterBalanceGroups = (
  balancesGroups: globalThis.ComputedRef<
    {
      title: string | null;
      balances: TokenAmount[];
    }[]
  >
) => {
  const lowercaseSearch = search.value.toLowerCase();

  return balancesGroups.value.map((balanceGroup) => {
    const filteredGroupBalances = balanceGroup.balances.filter(({ symbol, name, l1Address, address }) => {
      return Object.values({ address, name, symbol, l1Address })
        .filter((e) => typeof e === "string")
        .some((value) => value!.toLowerCase().includes(lowercaseSearch));
    });

    return {
      title: balanceGroup.title,
      balances: filteredGroupBalances,
    };
  });
};

const filteredBalances = computed(() => filterBalanceGroups(balanceGroups));

const fetch = () => {
  walletEraStore.requestBalance();
};
fetch();

const { reset: resetAutoUpdate, stop: stopAutoUpdate } = useInterval(() => {
  fetch();
}, 60000);

const unsubscribe = onboardStore.subscribeOnAccountChange((newAddress) => {
  if (!newAddress) return;
  resetSingleLoading();
  resetAutoUpdate();
  fetch();
});

onBeforeUnmount(() => {
  stopAutoUpdate();
  unsubscribe();
});
</script>

<style lang="scss" scoped></style>
