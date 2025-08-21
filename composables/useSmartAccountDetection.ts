export const useSmartAccountDetection = () => {
  const onboardStore = useOnboardStore();

  const isSmartAccount = ref(false);
  const walletCapabilities = ref<{
    supportsSendTransaction: boolean;
    supportsWriteContract: boolean;
    supportsPersonalSign: boolean;
    walletType: "smart-account" | "regular" | "unknown";
  }>({
    supportsSendTransaction: false,
    supportsWriteContract: false,
    supportsPersonalSign: false,
    walletType: "unknown",
  });

  const detectWalletCapabilities = async () => {
    try {
      const wallet = await onboardStore.getWallet();
      if (!wallet) return;

      // Test if wallet supports sendTransaction (eth_sendRawTransaction)
      const supportsSendTransaction = await testSendTransactionSupport(wallet);

      // Test if wallet supports writeContract (viem/wagmi style)
      const supportsWriteContract = await testWriteContractSupport(wallet);

      // Test if wallet supports personal_sign
      const supportsPersonalSign = await testPersonalSignSupport(wallet);

      isSmartAccount.value = !supportsSendTransaction && supportsWriteContract;

      walletCapabilities.value = {
        supportsSendTransaction,
        supportsWriteContract,
        supportsPersonalSign,
        walletType: isSmartAccount.value ? "smart-account" : "regular",
      };

      return walletCapabilities.value;
    } catch (error) {
      // console.warn("Failed to detect wallet capabilities:", error);
      return walletCapabilities.value;
    }
  };

  const testSendTransactionSupport = async (wallet: any): Promise<boolean> => {
    try {
      // Try to call a method that would trigger eth_sendRawTransaction
      const provider = await wallet.getProvider?.();
      if (!provider) return false;

      // Check if the provider has the method
      return typeof provider.request === "function" && provider.request.toString().includes("eth_sendRawTransaction");
    } catch {
      return false;
    }
  };

  const testWriteContractSupport = (wallet: any): Promise<boolean> => {
    try {
      // Check if wallet has writeContract method (viem/wagmi style)
      return Promise.resolve(typeof wallet.writeContract === "function");
    } catch {
      return Promise.resolve(false);
    }
  };

  const testPersonalSignSupport = async (wallet: any): Promise<boolean> => {
    try {
      const provider = await wallet.getProvider?.();
      if (!provider) return false;

      return typeof provider.request === "function" && provider.request.toString().includes("personal_sign");
    } catch {
      return false;
    }
  };

  return {
    isSmartAccount,
    walletCapabilities,
    detectWalletCapabilities,
  };
};
