<template>
  <CommonModal v-model:opened="modalDisplayed" :initial-focus="checkbox" :closable="false">
    <DialogTitle as="div" class="modal-title">{{ $t("legal.bridgeBetaTitle") }}</DialogTitle>
    <p class="modal-text">
      {{ $t("legal.bridgeBetaText") }}
    </p>

    <CommonCheckboxWithText ref="checkbox" v-model="warningChecked" class="mt-3">
      {{ $t("legal.agreeToTerms") }}
      <a href="https://zksync.io/terms" target="_blank" class="checkbox-link">{{ $t("legal.termsOfService") }}</a>
      {{ $t("legal.and") }}
      <a href="https://zksync.io/privacy" target="_blank" class="checkbox-link">{{ $t("legal.privacyPolicy") }}</a>
    </CommonCheckboxWithText>
    <CommonButton class="mt-8 w-full" variant="primary" :disabled="!warningChecked" @click="proceed()">
      {{ $t("legal.proceed") }}
    </CommonButton>
  </CommonModal>
</template>

<script lang="ts" setup>
import { DialogTitle } from "@headlessui/vue";
import { useStorage } from "@vueuse/core";

import { isCustomNode } from "@/data/networks";

const checkbox = ref<HTMLInputElement | undefined>();
const legalNoticeAccepted = useStorage("zksync-bridge-legal-notice-accepted", false);
const warningChecked = ref(legalNoticeAccepted.value);
const modalDisplayed = ref(!legalNoticeAccepted.value && !isCustomNode);

const proceed = () => {
  legalNoticeAccepted.value = true;
  modalDisplayed.value = false;
};
</script>

<style lang="scss" scoped>
.modal-title {
  @apply mb-4 text-center text-2xl font-normal;
}
.modal-text {
  @apply text-center text-sm leading-normal text-neutral-700 dark:text-neutral-400;
}
.checkbox-link {
  @apply underline underline-offset-2;
}
</style>
