<template>
  <HeaderMobileNavigation v-model:opened="modalOpened" title="Menu">
    <transition v-bind="TabsTransition" mode="out-in">
      <div v-if="openedTab === 'main'">
        <TypographyCategoryLabel size="sm" :padded="false" class="mb-4">Network</TypographyCategoryLabel>
        <CommonCardWithLineButtons>
          <DestinationItem
            :label="selectedNetwork.name"
            :icon="ChevronRightIcon"
            size="sm"
            @click="openedTab = 'network'"
          >
            <template #image>
              <DestinationIconContainer>
                <IconsEra aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>

        <TypographyCategoryLabel size="sm">Portal</TypographyCategoryLabel>
        <CommonCardWithLineButtons>
          <DestinationItem label="Bridge" as="RouterLink" :to="{ name: 'bridge' }" size="sm">
            <template #image>
              <DestinationIconContainer>
                <ArrowsUpDownIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
          <DestinationItem label="Assets" as="RouterLink" :to="{ name: 'index' }" size="sm">
            <template #image>
              <DestinationIconContainer>
                <WalletIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
          <DestinationItem label="Transactions" as="RouterLink" :to="{ name: 'transactions' }" size="sm">
            <template #image>
              <DestinationIconContainer>
                <ArrowsRightLeftIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>

        <TypographyCategoryLabel size="sm">Theme</TypographyCategoryLabel>
        <CommonCardWithLineButtons>
          <DestinationItem
            :label="selectedColorMode === 'dark' ? 'Dark mode' : 'Light mode'"
            size="sm"
            @click="switchColorMode()"
          >
            <template #image>
              <DestinationIconContainer>
                <SunIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
      </div>
      <div v-else-if="openedTab === 'network'">
        <div class="mb-block-gap flex items-center gap-block-padding-1/2">
          <CommonButtonBack size="sm" @click="openedTab = 'main'" />
          <span class="text-lg">Choose network</span>
        </div>
        <CommonCardWithLineButtons>
          <DestinationItem
            v-for="item in zkSyncNetworks.filter((e) => !e.hidden)"
            :key="item.key"
            :label="item.name"
            :icon="isNetworkSelected(item) ? CheckIcon : undefined"
            size="sm"
            @click="buttonClicked(item)"
          >
            <template #image>
              <DestinationIconContainer>
                <IconsEra aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
      </div>
    </transition>
  </HeaderMobileNavigation>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";

import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  ChevronRightIcon,
  SunIcon,
  WalletIcon,
} from "@heroicons/vue/24/outline";
import { storeToRefs } from "pinia";

import useColorMode from "@/composables/useColorMode";
import useNetworks from "@/composables/useNetworks";

import type { ZkSyncNetwork } from "@/data/networks";

import { useRoute } from "#imports";
import { useNetworkStore } from "@/store/network";
import { getNetworkUrl } from "@/utils/helpers";
import { TransitionSlideOutToLeft, TransitionSlideOutToRight } from "@/utils/transitions";

const props = defineProps({
  opened: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
}>();

const route = useRoute();

const TabsTransition = computed(() =>
  openedTab.value === "main" ? TransitionSlideOutToRight : TransitionSlideOutToLeft
);

const openedTab = ref<"main" | "network">("main");
const modalOpened = computed({
  get: () => props.opened,
  set: (value) => emit("update:opened", value),
});
watch(
  () => props.opened,
  (value) => {
    if (!value) {
      openedTab.value = "main";
    }
  }
);

const { switchColorMode, selectedColorMode } = useColorMode();

const { zkSyncNetworks } = useNetworks();
const { selectedNetwork } = storeToRefs(useNetworkStore());
const isNetworkSelected = (network: ZkSyncNetwork) => selectedNetwork.value.key === network.key;
const buttonClicked = (network: ZkSyncNetwork) => {
  if (isNetworkSelected(network)) {
    return;
  }
  window.location.href = getNetworkUrl(network, route.fullPath);
};
</script>

<style scoped lang="scss"></style>