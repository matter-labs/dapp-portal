<template>
  <CommonContentBlock>
    <p class="text-center">
      <slot />
    </p>
    <CommonButton variant="primary" class="mt-block-gap w-full" @click="onboardStore.openModal()">
      {{ $t("common.connectWallet") }}
    </CommonButton>
  </CommonContentBlock>
</template>

<script lang="ts" setup>
const onboardStore = useOnboardStore();
</script>
