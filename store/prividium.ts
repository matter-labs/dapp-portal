import { defineStore } from "pinia";

import { getPrividiumInstance } from "@/data/prividium";

let authenticationPromise: Promise<void>;
let resolveAuthentication: (() => void) | null = null;

const createAuthenticationPromise = () => {
  authenticationPromise = new Promise<void>((resolve) => {
    resolveAuthentication = resolve;
  });
};

// Initialize the promise immediately
createAuthenticationPromise();

export const usePrividiumStore = defineStore("prividium", () => {
  const { selectedNetwork } = storeToRefs(useNetworkStore());

  const isAuthenticated = ref(false);
  const isAuthenticating = ref(false);
  const authError = ref<string | undefined>();
  const prividiumInstance = selectedNetwork.value.isPrividium
    ? getPrividiumInstance(selectedNetwork.value.id)
    : undefined;

  const authModalOpen = ref(false);
  const authStep = ref<"prividium" | "wallet">("prividium");

  const requiresAuth = computed(() => {
    return selectedNetwork.value?.key?.includes("prividium") || false;
  });

  const authenticate = async () => {
    if (!prividiumInstance) {
      throw new Error("Prividium instance not initialized");
    }

    isAuthenticating.value = true;
    authError.value = undefined;

    try {
      await prividiumInstance.authorize();
      isAuthenticated.value = true;
      authStep.value = "wallet";

      // Resolve the authentication promise on successful login
      if (resolveAuthentication) {
        resolveAuthentication();
        resolveAuthentication = null;
      }

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
    prividiumInstance?.unauthorize();
    isAuthenticated.value = false;
    authStep.value = "prividium";
    authError.value = undefined;

    // Reset the authentication promise for future logins
    createAuthenticationPromise();
  };

  const checkAuthStatus = () => {
    if (!prividiumInstance) {
      isAuthenticated.value = false;
      return false;
    }

    const authStatus = prividiumInstance.isAuthorized();
    isAuthenticated.value = authStatus;

    if (authStatus) {
      authStep.value = "wallet";

      // If already authenticated, resolve the promise immediately
      if (resolveAuthentication) {
        resolveAuthentication();
        resolveAuthentication = null;
      }
    }

    return authStatus;
  };
  checkAuthStatus();

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

    // Reset the authentication promise when auth expires
    createAuthenticationPromise();

    if (requiresAuth.value) {
      openAuthModal();
    }
  };

  watch(requiresAuth, (needsAuth) => {
    if (needsAuth && !isAuthenticated.value) {
      openAuthModal();
    }
  });

  const waitForAuthentication = (): Promise<void> => {
    return authenticationPromise;
  };

  return {
    isAuthenticated: computed(() => isAuthenticated.value),
    isAuthenticating: computed(() => isAuthenticating.value),
    authError: computed(() => authError.value),
    requiresAuth,
    authModalOpen: computed(() => authModalOpen.value),
    authStep: computed(() => authStep.value),

    authenticate,
    logout,
    checkAuthStatus,
    openAuthModal,
    closeAuthModal,
    resetAuthStep,
    onAuthExpiry,
    waitForAuthentication,
    getPrividiumInstance: () => prividiumInstance,
  };
});
