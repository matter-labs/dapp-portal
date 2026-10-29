<template>
  <CommonModal v-model:opened="modalDisplayed" :initial-focus="checkbox" :closable="false">
    <DialogTitle as="div" class="modal-title">ZKsync Bridge is live on beta</DialogTitle>
    <p class="modal-text">
      Nothing on this website should be construed as an invitation, inducement, or solicitation to engage in investment
      activity. You understand that the bridge, asset, and transaction features available through this website are in
      beta and subject to testing, further development, and changes and is therefore provided "as is" without any
      warranties. Use of any of the features available through this website is done so entirely at your own risk.
    </p>

    <CommonCheckboxWithText
      ref="checkbox"
      v-model="warningChecked"
      class="mt-3"
      data-testid="terms-and-conditions-checkbox"
    >
      I agree to the <a href="https://zksync.io/terms" target="_blank" class="checkbox-link">Terms of Service</a> and
      <a href="https://zksync.io/privacy" target="_blank" class="checkbox-link">Privacy Policy</a>
    </CommonCheckboxWithText>
    <CommonButton
      class="mt-8 w-full"
      variant="primary"
      :disabled="!warningChecked"
      data-testid="proceed-button"
      @click="proceed()"
    >
      Proceed
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
