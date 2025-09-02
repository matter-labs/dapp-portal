<template>
  <CommonModal
    :opened="authModalOpen"
    :closable="false"
    :close-on-background-click="false"
    title="Authentication Required"
    @close="handleClose"
  >
    <div class="prividium-auth-modal">
      <div class="auth-steps">
        <div class="step" :class="{ active: authStep === 'prividium', completed: isAuthenticated }">
          <div class="step-indicator">
            <CheckIcon v-if="isAuthenticated" class="h-5 w-5" />
            <span v-else>1</span>
          </div>
          <div class="step-content">
            <h3 class="step-title">Prividium Authentication</h3>
            <p class="step-description">Sign in with your Prividium account</p>
          </div>
        </div>

        <div class="step" :class="{ active: authStep === 'wallet', completed: isConnected }">
          <div class="step-indicator">
            <CheckIcon v-if="isConnected" class="h-5 w-5" />
            <span v-else>2</span>
          </div>
          <div class="step-content">
            <h3 class="step-title">Connect Wallet</h3>
            <p class="step-description">Connect your wallet to continue</p>
          </div>
        </div>
      </div>

      <div v-if="authError" class="error-message">
        <ExclamationTriangleIcon class="h-5 w-5" />
        <span>{{ authError }}</span>
      </div>

      <div v-if="connectingWalletError" class="error-message">
        <ExclamationTriangleIcon class="h-5 w-5" />
        <span>{{ connectingWalletError }}</span>
      </div>

      <div class="action-section">
        <div v-if="authStep === 'prividium' && !isAuthenticated">
          <button :disabled="isAuthenticating" class="auth-button primary" @click="handlePrividiumAuth">
            <span v-if="isAuthenticating" class="loading-spinner" />
            {{ isAuthenticating ? "Authenticating..." : "Sign in with Prividium" }}
          </button>
        </div>

        <div v-else-if="authStep === 'wallet' && !isConnected">
          <button :disabled="isConnectingWallet" class="auth-button primary" @click="handleWalletConnect">
            <span v-if="isConnectingWallet" class="loading-spinner" />
            {{ isConnectingWallet ? "Connecting..." : "Connect Wallet" }}
          </button>
          <p class="auth-info">Select your preferred wallet to continue.</p>
        </div>

        <div v-else-if="isAuthenticated && isConnected" class="success-state">
          <CheckCircleIcon class="h-12 w-12 text-green-500" />
          <h3 class="success-title">Authentication Complete!</h3>
          <p class="success-description">You can now access the application.</p>
          <button class="auth-button primary" @click="handleComplete">Continue to Application</button>
        </div>
      </div>
    </div>
  </CommonModal>
</template>

<script lang="ts" setup>
import { CheckIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/vue/24/outline";

const prividiumStore = usePrividiumStore();
const { selectedNetwork } = storeToRefs(useNetworkStore());
const onboardStore = useOnboardStore();

const { authModalOpen, authStep, isAuthenticated, isAuthenticating, authError } = storeToRefs(prividiumStore);

const { isConnected, isConnectingWallet, connectingWalletError } = storeToRefs(onboardStore);

const handlePrividiumAuth = async () => {
  try {
    const success = await prividiumStore.authenticate();
    if (success && !isConnected.value) {
      await nextTick();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Prividium authentication failed:", error);
  }
};

const handleWalletConnect = () => {
  try {
    onboardStore.openModal();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Wallet connection failed:", error);
  }
};

const handleComplete = () => {
  prividiumStore.closeAuthModal();
};

const handleClose = () => {
  if (isAuthenticated.value && isConnected.value) {
    prividiumStore.closeAuthModal();
  }
};

watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) return;
    if (!selectedNetwork.value.isPrividium) return;

    prividiumStore.checkAuthStatus();
    prividiumStore.openAuthModal();
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.prividium-auth-modal {
  @apply space-y-6;

  .auth-steps {
    @apply flex flex-col space-y-4;

    .step {
      @apply flex items-center space-x-4 rounded-lg border-2 border-neutral-200 p-4 transition-all dark:border-neutral-700;

      &.active {
        @apply border-primary-400 bg-neutral-50 dark:border-primary-400 dark:bg-primary-400/10;
      }

      &.completed {
        @apply border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/20;
      }

      .step-indicator {
        @apply flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold dark:bg-neutral-700;

        .active & {
          @apply bg-primary-400 text-white dark:bg-primary-400;
        }

        .completed & {
          @apply bg-green-400 text-white dark:bg-green-500;
        }
      }

      .step-content {
        @apply flex-1;

        .step-title {
          @apply text-lg font-semibold text-neutral-900 dark:text-white;
        }

        .step-description {
          @apply text-sm text-neutral-600 dark:text-neutral-400;
        }
      }
    }
  }

  .error-message {
    @apply flex items-center space-x-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400;
  }

  .action-section {
    @apply space-y-4;

    .auth-button {
      @apply flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-3 font-semibold transition-all;

      &.primary {
        @apply bg-primary-400 text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:disabled:bg-neutral-700;
      }

      &.secondary {
        @apply border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800;
      }

      .loading-spinner {
        @apply mr-2.5 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent;
      }
    }

    .auth-info {
      @apply mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400;
    }

    .success-state {
      @apply flex flex-col items-center space-y-3 py-4;

      .success-title {
        @apply text-xl font-semibold text-green-600 dark:text-green-400;
      }

      .success-description {
        @apply text-sm text-neutral-600 dark:text-neutral-400;
      }
    }
  }

  .retry-section {
    @apply flex justify-center;
  }
}
</style>
