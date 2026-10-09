import { createEthersSdk } from "@matterlabs/zksync-js/ethers";

import type { TransactionRequest } from "ethers";
import type { Address } from "viem";

// Built right before sending: on interop-bundle chains the withdrawal salt is derived from the pending nonce
export const prepareWithdrawalSteps = async (params: {
  token: Address;
  amount: bigint;
  to: Address;
}): Promise<TransactionRequest[]> => {
  const client = await useZkSyncWalletStore().getReadOnlyZkSyncClient();
  const { steps } = await createEthersSdk(client).withdrawals.prepare(params);
  const transactions = steps.map((step) => step.tx);
  const withdrawal = transactions[transactions.length - 1];
  if (transactions.length === 1 || withdrawal.gasLimit) return transactions;

  // The SDK asks for an L2 vault approval on every ERC20, but bridged tokens are burned without one
  const gasLimit = await client.l2.estimateGas(withdrawal).catch(() => undefined);
  return gasLimit ? [{ ...withdrawal, gasLimit }] : transactions;
};
