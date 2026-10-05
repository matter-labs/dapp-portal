import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import { mapApiTransfer } from "@/utils/mappers";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("ofetch", () => ({ $fetch: fetchMock }));

const USER = "0x1111111111111111111111111111111111111111";

const withdrawal = (hash: string, info: Partial<TransactionInfo["info"]>) =>
  ({
    type: "withdrawal",
    token: { address: "0x000000000000000000000000000000000000800A", symbol: "ETH", decimals: 18, amount: "1" },
    from: { address: USER, destination: { key: "era", label: "ZKsync", iconUrl: "" } },
    to: { address: USER, destination: { key: "ethereum", label: "Ethereum", iconUrl: "" } },
    transactionHash: hash,
    timestamp: new Date(0).toISOString(),
    info: { completed: true, withdrawalFinalizationAvailable: true, ...info },
  } as TransactionInfo);

// A claim saved as completed by this browser before claim receipts were checked
const unverifiedClaim = withdrawal("0x01", { toTransactionHash: "0xc1" });
const userTransactions = ref<TransactionInfo[]>([
  unverifiedClaim,
  withdrawal("0x02", { toTransactionHash: "0xc2", claimVerified: true }),
  withdrawal("0x03", {}),
  withdrawal("0x04", { completed: false }),
  { ...withdrawal("0x05", { toTransactionHash: "0xc5" }), type: "transfer" },
]);
const verifyClaimedWithdrawal = vi.fn();
const isConnected = ref(true);
const eraNetwork = ref<{ name: string; blockExplorerApi?: string }>({ name: "ZKsync" });

vi.stubGlobal("defineStore", (_id: string, setup: () => unknown) => setup);
vi.stubGlobal("storeToRefs", (store: object) => store);
vi.stubGlobal("computed", computed);
vi.stubGlobal("mapApiTransfer", mapApiTransfer);
vi.stubGlobal("useInterval", () => ({ reset: () => undefined, stop: () => undefined }));
vi.stubGlobal("useOnboardStore", () => ({
  account: ref({ address: USER }),
  isConnected,
  subscribeOnAccountChange: () => () => undefined,
}));
vi.stubGlobal("useZkSyncProviderStore", () => ({ eraNetwork }));
vi.stubGlobal("useDestinationsStore", () => ({ destinations: ref({}) }));
vi.stubGlobal("useZkSyncTransactionStatusStore", () => ({
  userTransactions,
  verifyClaimedWithdrawal,
  getTransaction: () => undefined,
}));

const { useZkSyncWithdrawalsStore } = await import("@/store/zksync/withdrawals");

describe("withdrawals update", () => {
  beforeEach(() => {
    verifyClaimedWithdrawal.mockReset();
    fetchMock.mockReset().mockResolvedValue({ items: [] });
    isConnected.value = true;
    eraNetwork.value = { name: "ZKsync" };
  });

  it("checks only the unverified claims made in this browser", async () => {
    await useZkSyncWithdrawalsStore().updateWithdrawalsIfPossible();

    expect(verifyClaimedWithdrawal.mock.calls).toStrictEqual([[unverifiedClaim]]);
    // Without a block explorer API, withdrawals are not imported
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks the claims before importing withdrawals from the block explorer", async () => {
    eraNetwork.value = { name: "ZKsync", blockExplorerApi: "https://explorer.test" };

    await useZkSyncWithdrawalsStore().updateWithdrawalsIfPossible();

    expect(verifyClaimedWithdrawal).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`https://explorer.test/address/${USER}/transfers?type=withdrawal`);
    expect(verifyClaimedWithdrawal.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
  });

  it("does nothing without a connected account", async () => {
    isConnected.value = false;

    await useZkSyncWithdrawalsStore().updateWithdrawalsIfPossible();

    expect(verifyClaimedWithdrawal).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
