<template>
  <HeaderMobileNavigation v-model:opened="modalOpened" title="Account">
    <transition v-bind="TabsTransition" mode="out-in">
      <div v-if="openedTab === 'main'" class="h-full">
        <CommonCardWithLineButtons>
          <DestinationItem :icon="copied ? CheckIcon : DocumentDuplicateIcon" size="sm" @click="copy()">
            <template #label>
              <div class="break-all">{{ account.address }}</div>
            </template>
            <template #image>
              <AddressAvatar :address="account.address!" class="h-full w-full" />
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
        <CommonCardWithLineButtons v-if="selectedNetwork.blockExplorerUrl" class="mt-block-padding-1/2">
          <DestinationItem
            label="View on Explorer"
            as="a"
            :href="buildExplorerUrl(selectedNetwork.blockExplorerUrl, account.address)"
            target="_blank"
            :icon="ArrowTopRightOnSquareIcon"
            size="sm"
          >
            <template #image>
              <DestinationIconContainer>
                <Squares2X2Icon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
        <CommonCardWithLineButtons
          v-if="selectedNetwork.displaySettings?.showPartnerLinks"
          class="mt-block-padding-1/2"
        >
          <DestinationItem label="Help" :icon="ChevronRightIcon" size="sm" @click="openedTab = 'help'">
            <template #image>
              <DestinationIconContainer>
                <InformationCircleIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
        <CommonCardWithLineButtons class="mt-block-padding-1/2">
          <DestinationItem label="Logout" size="sm" @click="logout()">
            <template #image>
              <DestinationIconContainer>
                <PowerIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
      </div>
      <div v-else-if="openedTab === 'help'">
        <div class="mb-block-gap flex items-center gap-block-padding-1/2">
          <CommonButtonBack size="sm" @click="openedTab = 'main'" />
          <span class="text-lg">Help</span>
        </div>
        <CommonCardWithLineButtons class="mt-block-padding-1/2">
          <DestinationItem
            label="Discord"
            description="Get support, follow announcements and connect with community"
            as="a"
            href="https://join.zksync.dev/"
            target="_blank"
            :icon="ArrowTopRightOnSquareIcon"
            size="sm"
          >
            <template #image>
              <div class="flex h-full w-full items-center justify-center rounded-full bg-[#5865F2] text-white">
                <IconsDiscord class="h-6 w-6" />
              </div>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
        <CommonCardWithLineButtons class="mt-block-padding-1/2">
          <DestinationItem
            label="FAQ"
            description="Find tutorials and answers to the most common questions"
            as="a"
            href="https://matterlabs.gitbook.io/zksync-community-hub/support/faq"
            target="_blank"
            :icon="ArrowTopRightOnSquareIcon"
            size="sm"
          >
            <template #image>
              <DestinationIconContainer>
                <QuestionMarkCircleIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
        <CommonCardWithLineButtons class="mt-block-padding-1/2">
          <DestinationItem
            label="Official Documentation"
            description="Developer resources and technical ZKsync documentation"
            as="a"
            href="https://era.zksync.io"
            target="_blank"
            :icon="ArrowTopRightOnSquareIcon"
            size="sm"
          >
            <template #image>
              <DestinationIconContainer>
                <BookOpenIcon aria-hidden="true" />
              </DestinationIconContainer>
            </template>
          </DestinationItem>
        </CommonCardWithLineButtons>
      </div>
    </transition>
  </HeaderMobileNavigation>
</template>

<script lang="ts" setup>
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  PowerIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
} from "@heroicons/vue/24/outline";

const props = defineProps({
  opened: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (eventName: "update:opened", value: boolean): void;
}>();

const TabsTransition = computed(() =>
  openedTab.value === "main" ? TransitionSlideOutToRight : TransitionSlideOutToLeft
);

const openedTab = ref<"main" | "help">("main");
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
const logout = () => {
  modalOpened.value = false;
  onboardStore.disconnect();
};

const onboardStore = useOnboardStore();
const { account, isConnected } = storeToRefs(onboardStore);
watch(
  () => isConnected,
  (connected) => {
    if (!connected) {
      modalOpened.value = false;
    }
  }
);
const { copy, copied } = useCopy(computed(() => account.value.address!));
const { selectedNetwork } = storeToRefs(useNetworkStore());
</script>

<style scoped lang="scss"></style>
