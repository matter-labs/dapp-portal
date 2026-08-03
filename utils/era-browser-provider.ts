import { BrowserProvider } from "zksync-ethers";

import type { Eip1193Provider, Networkish } from "ethers";
import type { Provider } from "zksync-ethers";

/**
 * zksync-ethers broadcasts EIP-712 (type 113) transactions through the signer's browser provider,
 * not the L2 provider passed to `Signer.from`. Wallet RPCs can't decode type 113 — MetaMask defaults
 * ZKsync Era to Infura since 13.36.0 (MetaMask/metamask-extension#43407) — so redirect broadcasts.
 */
export class EraBrowserProvider extends BrowserProvider {
  private readonly l2Provider: Provider;

  constructor(ethereum: Eip1193Provider, network: Networkish | undefined, l2Provider: Provider) {
    super(ethereum, network);
    this.l2Provider = l2Provider;
  }

  override broadcastTransaction(signedTx: string) {
    return this.l2Provider.broadcastTransaction(signedTx);
  }
}
