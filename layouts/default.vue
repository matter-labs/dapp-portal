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
