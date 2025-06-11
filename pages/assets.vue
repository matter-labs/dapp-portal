<template>
  <div>
    <NetworkDeprecationAlert />
    <PageTitle>Assets</PageTitle>

    <template v-if="!isConnected">
      <ConnectWalletBlock>Connect wallet to view your balances on {{ eraNetwork.name }}</ConnectWalletBlock>
    </template>
    <template v-else>
      <TransactionWithdrawalsAvailableForClaimAlert />
      <EcosystemBlock
        v-if="eraNetwork.displaySettings?.showPartnerLinks && ecosystemBannerVisible"
        show-close-button
        class="mb-block-padding-1/2 sm:mb-block-gap"
      />
      <CommonContentBlock class="mb-block-gap">
        <div class="flex flex-col flex-wrap gap-block-gap sm:flex-row sm:items-center sm:justify-between">
          <CommonTotalBalance :balance="balance" :loading="loading" :error="balanceError" />
          <CommonButtonGroup v-if="!noBalances">
            <CommonButton
              variant="primary"
              as="RouterLink"
              :to="{
                name: eraNetwork.l1Network ? 'receive-methods' : 'receive',
              }"
            >
              <template #icon>
                <ArrowDownLeftIcon aria-hidden="true" />
              </template>
              <template #default>Receive</template>
            </CommonButton>
            <CommonButton
              variant="primary"
              as="RouterLink"
              :to="{ name: eraNetwork.l1Network ? 'send-methods' : 'send' }"
            >
              <template #icon>
                <ArrowUpRightIcon aria-hidden="true" />
              </template>
              <template #default>Send</template>
            </CommonButton>
          </CommonButtonGroup>
        </div>
      </CommonContentBlock>

      <template v-if="!noBalances">
        <TypographyCategoryLabel>
          <span>Balance</span>
          <template #right>
            <CommonButtonLabel as="RouterLink" variant="light" :to="{ name: 'balances' }">View all</CommonButtonLabel>
          </template>
        </TypographyCategoryLabel>
        <CommonCardWithLineButtons>
          <template v-if="loading">
            <TokenBalanceLoader v-for="index in 2" :key="index" send-route-name />
          </template>
          <div v-else-if="balanceError">
            <CommonErrorBlock @try-again="fetch">
              {{ balanceError.message }}
            </CommonErrorBlock>
          </div>
          <template v-else-if="displayedBalances.length">
            <TokenBalance
              v-for="item in displayedBalances"
              :key="item.address"
              as="div"
              :send-route-name="eraNetwork.l1Network ? 'send-methods' : 'send'"
              v-bind="item"
            />
          </template>
          <template v-else>
            <CommonEmptyBlock class="mx-3 mb-3 mt-1">
              <div class="wrap-balance">
                You don't have any balances on
                <span class="font-medium">{{ destinations.era.label }}</span>
              </div>
              <span v-if="eraNetwork.l1Network" class="mt-1.5 inline-block">
                Proceed to
                <NuxtLink class="link" :to="{ name: 'receive-methods' }">Add funds</NuxtLink> page to add balance to
                your account
              </span>
            </CommonEmptyBlock>
          </template>
        </CommonCardWithLineButtons>
      </template>

      <template v-if="noBalances">
        <TypographyCategoryLabel>
          To start using ZKsync ecosystem, deposit tokens in any convenient way
        </TypographyCategoryLabel>

        <div class="flex flex-col gap-block-gap">
          <BridgeFromEthereumButton v-if="eraNetwork.l1Network" />

          <CommonCardWithLineButtons v-for="(item, index) in depositMethods" :key="index">
            <DestinationItem v-bind="item.props">
              <template v-if="item.icon" #image>
                <DestinationIconContainer>
                  <component :is="item.icon" aria-hidden="true" />
                </DestinationIconContainer>
              </template>
            </DestinationItem>
          </CommonCardWithLineButtons>
        </div>
      </template>
      <template v-else>
        <TypographyCategoryLabel>Deposit more tokens to ZKsync</TypographyCategoryLabel>

        <CommonCardWithLineButtons>
          <DestinationItem v-for="(item, index) in depositMethods" :key="index" v-bind="item.props">
            <template v-if="item.icon" #image>
              <DestinationIconContainer>
                <component :is="item.icon" aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
      </template>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {
  ArrowDownLeftIcon,
  ArrowsUpDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  QrCodeIcon,
} from "@heroicons/vue/24/outline";
import { mainnet } from "viem/chains";

import useEcosystemBanner from "@/composables/zksync/deposit/useEcosystemBanner";

import type { FunctionalComponent } from "vue";

const onboardStore = useOnboardStore();
const walletStore = useZkSyncWalletStore();
const { isConnected } = storeToRefs(onboardStore);
const { balance, balanceInProgress, balanceError } = storeToRefs(walletStore);
const { destinations } = storeToRefs(useDestinationsStore());
const { eraNetwork } = storeToRefs(useZkSyncProviderStore());

const { ecosystemBannerVisible } = useEcosystemBanner();

const { loading, reset: resetSingleLoading } = useSingleLoading(computed(() => balanceInProgress.value));

const displayedBalances = computed(() => {
  return balance.value.filter(({ amount, decimals, price }) => {
    const decimalAmount = price ? removeSmallAmount(amount, decimals, price) : parseTokenAmount(amount, decimals);
    if (!isOnlyZeroes(decimalAmount)) {
      return true;
    }
    return false;
  });
});
const noBalances = computed(() => !loading.value && !balanceError.value && !displayedBalances.value.length);

const depositMethods = computed(() => {
  const methods: { props: Record<string, unknown>; icon?: FunctionalComponent }[] = [];
  if (eraNetwork.value.l1Network && !noBalances.value) {
    methods.push({
      props: {
        iconUrl: destinations.value.ethereum.iconUrl,
        label: `Bridge from ${eraNetwork.value.l1Network?.name}`,
        description: `Receive tokens from your ${eraNetwork.value.l1Network?.name} account`,
        as: "RouterLink",
        to: {
          name: "bridge",
        },
      },
    });
  }

  const isMainnet = eraNetwork.value.l1Network?.id === mainnet.id;
  const isTestnet = eraNetwork.value.l1Network && eraNetwork.value.l1Network.id !== mainnet.id;
  if (isTestnet && eraNetwork.value.displaySettings?.showPartnerLinks) {
    methods.push({
      props: {
        iconUrl: "/img/faucet.svg",
        label: "Faucet",
        description: "Receive testnet funds",
        as: "a",
        href: "https://docs.zksync.io/build/tooling/network-faucets.html",
        target: "_blank",
        icon: ArrowTopRightOnSquareIcon,
      },
    });
  }
  methods.push({
    props: {
      label: "View your address",
      description: `Receive tokens from another ${eraNetwork.value.name} account`,
      as: "RouterLink",
      to: {
        name: "receive",
      },
    },
    icon: QrCodeIcon,
  });
  if (isMainnet && eraNetwork.value.displaySettings?.showPartnerLinks) {
    methods.push({
      props: {
        label: "Top-up with cash",
        description: "Buy tokens using a card or another method for fiat",
        as: "a",
        href: "https://zksync.dappradar.com/ecosystem?category=non_dapps_on_off_ramps",
        target: "_blank",
        icon: ArrowTopRightOnSquareIcon,
      },
      icon: BanknotesIcon,
    });
    methods.push({
      props: {
        label: "Bridge from other networks",
        description: "Explore ecosystem of third party bridges",
        as: "a",
        href: "https://zksync.dappradar.com/ecosystem?category=defi_bridge",
        target: "_blank",
        icon: ArrowTopRightOnSquareIcon,
      },
      icon: ArrowsUpDownIcon,
    });
  }
  return methods;
});

const fetch = () => {
  if (!isConnected.value) return;
  walletStore.requestBalance();
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
