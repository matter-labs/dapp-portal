<template>
  <div class="app-layout">
    <AuthPrividiumAuthModal />
    <LoadersConnecting />
    <ModalConnectingWalletError />
    <ModalNetworkChangedWarning v-if="!isConnectingWallet" />
    <ModalLegalNotice />

    <Header />
    <main class="app-layout-main">
      <NuxtPage />
    </main>
    <Footer />
  </div>
</template>

<script lang="ts" setup>
const { isConnectingWallet } = storeToRefs(useOnboardStore());
const { locale } = useI18n();

// 监听语言变化，确保整个应用重新渲染
watch(locale, (newLocale) => {
  console.log("App language changed to:", newLocale);
  // 不再强制刷新页面，让 Vue 的响应式系统处理国际化更新
});
</script>

<style lang="scss" scoped>
.app-layout {
  @apply grid;
  min-height: 100vh;
  min-height: 100dvh;
  grid-template-rows: auto 1fr max-content;

  .app-layout-main {
    @apply flex min-h-0 w-full min-w-0 max-w-[700px] flex-col justify-self-center p-2 md:px-0 md:py-4;
  }
}
</style>
