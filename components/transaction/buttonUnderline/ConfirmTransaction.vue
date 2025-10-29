<template>
  <CommonButtonUnderlineText :opened="opened">
    {{ $t("transaction.confirmInWallet", { walletName }) }}
  </CommonButtonUnderlineText>
</template>

<script lang="ts" setup>
defineProps({
  opened: {
    type: Boolean,
    required: true,
  },
});

const { walletName } = storeToRefs(useOnboardStore());
</script>
