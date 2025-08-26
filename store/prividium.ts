import { defineStore } from "pinia";

import type { PrividiumChain } from "@repo/prividium-sdk";

export const usePrividiumStore = defineStore("prividium", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());

  const isAuthenticated = ref(false);
  const isAuthenticating = ref(false);
  const authError = ref<string | undefined>();
  const prividiumInstance = ref<PrividiumChain | null>(null);
  const authModalOpen = ref(false);
  const authStep = ref<"prividium" | "wallet">("prividium");

  const requiresAuth = computed(() => {
    return selectedNetwork.value?.key?.includes("prividium") || false;
  });

  const setPrividiumInstance = (instance: PrividiumChain | null) => {
    prividiumInstance.value = instance;
  };

  const authenticate = async () => {
    if (!prividiumInstance.value) {
      throw new Error("Prividium instance not initialized");
    }

    isAuthenticating.value = true;
    authError.value = undefined;

    try {
      await prividiumInstance.value.authorize();
      isAuthenticated.value = true;
      authStep.value = "wallet";
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";

      if (errorMessage.includes("cancelled")) {
        authError.value = "Authentication cancelled by user";
      } else {
        authError.value = errorMessage;
      }

      isAuthenticated.value = false;
      return false;
    } finally {
      isAuthenticating.value = false;
    }
  };

  const logout = () => {
    if (prividiumInstance.value) {
      prividiumInstance.value.unauthorize();
    }
    isAuthenticated.value = false;
    authStep.value = "prividium";
    authError.value = undefined;
  };

  const checkAuthStatus = () => {
    if (!prividiumInstance.value) {
      isAuthenticated.value = false;
      return false;
    }

    const authStatus = prividiumInstance.value.isAuthorized();
    isAuthenticated.value = authStatus;

    if (authStatus) {
      authStep.value = "wallet";
    }

    return authStatus;
  };

  const openAuthModal = () => {
    authModalOpen.value = true;
    authStep.value = "prividium";
  };

  const closeAuthModal = () => {
    authModalOpen.value = false;
    authError.value = undefined;
  };

  const resetAuthStep = () => {
    authStep.value = "prividium";
  };

  const onAuthExpiry = () => {
    isAuthenticated.value = false;
    authStep.value = "prividium";

    if (requiresAuth.value) {
      openAuthModal();
    }
  };

  watch(requiresAuth, (needsAuth) => {
    if (needsAuth && !isAuthenticated.value) {
      openAuthModal();
    }
  });

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    isAuthenticating: computed(() => isAuthenticating.value),
    authError: computed(() => authError.value),
    requiresAuth,
    authModalOpen: computed(() => authModalOpen.value),
    authStep: computed(() => authStep.value),
    prividiumInstance: computed(() => prividiumInstance.value),

    setPrividiumInstance,
    authenticate,
    logout,
    checkAuthStatus,
    openAuthModal,
    closeAuthModal,
    resetAuthStep,
    onAuthExpiry,
  };
});
