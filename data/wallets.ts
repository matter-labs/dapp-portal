type WalletEntry = { walletName: string; type: "injected" | "walletConnect" };

export const confirmedSupportedWallets: WalletEntry[] = [
  { walletName: "MetaMask", type: "injected" },
  { walletName: "BitKeep", type: "injected" },
  { walletName: "BlockWallet", type: "injected" },
  { walletName: "MathWallet", type: "injected" },

  { walletName: "MetaMask", type: "walletConnect" },
  { walletName: "imToken", type: "walletConnect" },
];

export const disabledWallets: WalletEntry[] = [
  { walletName: "Argent", type: "walletConnect" }, // Argent has different L1 and L2 Era addresses, also Remote wallet type for zkSync Lite should be fixed
];
