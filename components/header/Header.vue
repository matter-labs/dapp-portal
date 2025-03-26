<template>
  <header class="header">
    <HeaderMobileMainNavigation v-model:opened="mobileMainNavigationOpened" />
    <HeaderMobileAccountNavigation v-model:opened="mobileAccountNavigationOpened" />

    <div class="logo-container">
      <NuxtLink :to="{ name: 'bridge' }">
        <IconsZkSync class="logo-icon" />
      </NuxtLink>
      <span class="beta-label">Beta</span>
    </div>
    <div class="links-container">
      <NuxtLink
        v-if="selectedNetwork.displaySettings?.onramp"
        class="link-item"
        :to="{ name: 'on-ramp' }"
        :class="{ 'router-link-exact-active': routes.onramp.includes(route.name?.toString() || '') }"
      >
        <BanknotesIcon class="link-icon" aria-hidden="true" />
        On-Ramp
      </NuxtLink>
      <NuxtLink
        class="link-item"
        :to="{ name: 'bridge' }"
        :class="{ 'router-link-exact-active': routes.bridge.includes(route.name?.toString() || '') }"
      >
        <ArrowsUpDownIcon class="link-icon" aria-hidden="true" />
        Bridge
      </NuxtLink>
      <NuxtLink
        class="link-item"
        :to="{ name: 'assets' }"
        :class="{ 'router-link-exact-active': routes.assets.includes(route.name?.toString() || '') }"
      >
        <WalletIcon class="link-icon" aria-hidden="true" />
        Assets
      </NuxtLink>
      <NuxtLink class="link-item" :to="{ name: 'transfers' }">
        <ArrowsRightLeftIcon class="link-icon" aria-hidden="true" />
        Transfers
        <transition v-bind="TransitionOpacity()">
          <CommonBadge v-if="withdrawalsAvailableForClaiming.length">
            {{ withdrawalsAvailableForClaiming.length }}
          </CommonBadge>
        </transition>
      </NuxtLink>
    </div>
    <div class="right-side">
      <HeaderNetworkDropdown class="network-dropdown" />
      <CommonButton v-if="!isConnected" variant="primary" @click="onboardStore.openModal()">
        <span class="whitespace-nowrap">Connect wallet</span>
      </CommonButton>
      <template v-else>
        <div class="sm:hidden">
          <HeaderAccountDropdownButton no-chevron @click="mobileAccountNavigationOpened = true" />
        </div>
        <div class="hidden sm:block">
          <HeaderAccountDropdown />
        </div>
      </template>
      <CommonButton class="color-mode-button" @click="switchColorMode()">
        <SunIcon v-if="selectedColorMode === 'dark'" class="h-6 w-6" aria-hidden="true" />
        <MoonIcon v-else class="h-6 w-6" aria-hidden="true" />
      </CommonButton>
      <CommonButton class="hamburger-icon" @click="mobileMainNavigationOpened = true">
        <Bars3Icon class="h-6 w-6" aria-hidden="true" />
        <transition v-bind="TransitionOpacity()">
          <CommonBadge v-if="withdrawalsAvailableForClaiming.length" class="action-available-badge">
            {{ withdrawalsAvailableForClaiming.length }}
          </CommonBadge>
        </transition>
      </CommonButton>
    </div>
  </header>
</template>

<script lang="ts" setup>
import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
  MoonIcon,
  SunIcon,
  WalletIcon,
  BanknotesIcon,
} from "@heroicons/vue/24/outline";

const route = useRoute();

const routes = {
  bridge: ["bridge", "bridge-withdraw"],
  assets: ["assets", "balances", "receive-methods", "receive", "send-methods", "send"],
  onramp: ["on-ramp"],
};

const onboardStore = useOnboardStore();
const { selectedNetwork } = storeToRefs(useNetworkStore());
const { isConnected } = storeToRefs(onboardStore);
const { withdrawalsAvailableForClaiming } = storeToRefs(useZkSyncWithdrawalsStore());

const mobileMainNavigationOpened = ref(false);
const mobileAccountNavigationOpened = ref(false);

const { selectedColorMode, switchColorMode } = useColorMode();
</script>

<style lang="scss" scoped>
.header {
  @apply z-50 flex w-full items-center gap-2 p-2 sm:gap-10 sm:p-4;

  .logo-container {
    @apply flex w-full flex-shrink items-center gap-2 sm:w-max;
    .logo-icon {
      @apply h-auto w-full max-w-[140px] sm:max-w-[160px];
    }
    .beta-label {
      @apply block rounded-lg bg-neutral-100 p-2 text-xs font-normal uppercase leading-none dark:bg-neutral-900;
    }
  }
  .links-container {
    @apply hidden items-center gap-10 lg:flex;

    .link-item {
      @apply flex items-center gap-1 text-lg text-neutral-600 dark:text-neutral-500;
      &.router-link-exact-active {
        @apply text-black dark:text-white;

        .link-icon {
          @apply text-black dark:text-white;
        }
      }

      .link-icon {
        @apply h-6 w-6 text-neutral-400 dark:text-neutral-500;
      }
    }
  }
  .right-side {
    @apply ml-auto flex items-center gap-1 sm:gap-3;

    .network-dropdown,
    .color-mode-button {
      @apply hidden xl:block;
    }
    .hamburger-icon {
      @apply relative xl:hidden;

      .action-available-badge {
        @apply absolute -right-1 -top-1 lg:hidden;
      }
    }
  }
}
</style>
