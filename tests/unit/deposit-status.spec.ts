import {
  encodeAbiParameters,
  encodeEventTopics,
  getAbiItem,
  WaitForTransactionReceiptTimeoutError,
  type Abi,
  type AbiEvent,
  type Hash,
} from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, h, ref } from "vue";
import IZkSyncHyperchain from "zksync-ethers/abi/IZkSyncHyperchain.json";

import { heightTransitionStub, renderTemplate, slotStub, stub, toText } from "./helpers/render-template";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";

const SENDER = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const L1_TRANSACTION_HASH = `0x${"a".repeat(64)}` as Hash;
const L2_TRANSACTION_HASH = `0x${"b".repeat(64)}` as Hash;
const L1_LABEL = "Ethereum Test";
const L2_LABEL = "ZKsync Test Chain";

const waitForTransactionReceipt = vi.fn();
const getTransactionReceipt = vi.fn();
const getTransactionDetails = vi.fn();

vi.stubGlobal("defineStore", (_id: string, setup: () => unknown) => setup);
vi.stubGlobal("storeToRefs", (store: object) => store);
vi.stubGlobal("computed", computed);
vi.stubGlobal("retry", (func: () => Promise<unknown>) => func());
vi.stubGlobal("useOnboardStore", () => ({
  account: ref({ address: SENDER }),
  getPublicClient: () => ({ waitForTransactionReceipt }),
}));
vi.stubGlobal("useZkSyncProviderStore", () => ({
  eraNetwork: ref({ key: "test" }),
  requestProvider: () => Promise.resolve({ getTransactionReceipt, getTransactionDetails }),
}));

const isWithdrawalFinalized = vi.fn();
vi.stubGlobal("useZkSyncWalletStore", () => ({
  getL1VoidSigner: () => Promise.resolve({ isWithdrawalFinalized }),
}));

const { useZkSyncTransactionStatusStore } = await import("@/store/zksync/transactionStatus");

// The NewPriorityRequest log that the chain contract emits on L1 for the deposit
const newPriorityRequestLog = (l2TransactionHash: Hash) => {
  const abi = IZkSyncHyperchain as Abi;
  const event = getAbiItem({ abi, name: "NewPriorityRequest" }) as AbiEvent;
  const l2Transaction = {
    txType: 255n,
    from: BigInt(SENDER),
    to: BigInt(RECIPIENT),
    gasLimit: 0n,
    gasPerPubdataByteLimit: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
    paymaster: 0n,
    nonce: 0n,
    value: 0n,
    reserved: [0n, 0n, 0n, 0n],
    data: "0x",
    signature: "0x",
    factoryDeps: [],
    paymasterInput: "0x",
    reservedDynamic: "0x",
  };
  return {
    topics: encodeEventTopics({ abi, eventName: "NewPriorityRequest" }),
    data: encodeAbiParameters(event.inputs, [0n, l2TransactionHash, 0n, l2Transaction, []]),
  };
};

const ETH_L1_ADDRESS = "0x0000000000000000000000000000000000000000";
const makeTransaction = (type: TransactionInfo["type"], info: TransactionInfo["info"]): TransactionInfo => ({
  type,
  // A deposit keeps the token's L1 address
  token: { address: ETH_L1_ADDRESS, symbol: "ETH", decimals: 18, amount: "1" } as TransactionInfo["token"],
  from: { address: SENDER, destination: { key: "ethereum", label: L1_LABEL, iconUrl: "" } },
  to: { address: RECIPIENT, destination: { key: "era", label: L2_LABEL, iconUrl: "" } },
  transactionHash: L1_TRANSACTION_HASH,
  timestamp: new Date(0).toISOString(),
  info,
});
const pendingInfo = () => ({ expectedCompleteTimestamp: new Date(0).toISOString(), completed: false });

describe("transaction status", () => {
  const { waitForCompletion } = useZkSyncTransactionStatusStore();

  beforeEach(() => {
    waitForTransactionReceipt.mockReset().mockResolvedValue({
      status: "success",
      logs: [{ topics: [`0x${"c".repeat(64)}`], data: "0x" }, newPriorityRequestLog(L2_TRANSACTION_HASH)],
    });
    getTransactionReceipt.mockReset();
    getTransactionDetails.mockReset();
  });

  it("marks the deposit failed when its L2 transaction reverted", async () => {
    getTransactionReceipt.mockResolvedValue({ hash: L2_TRANSACTION_HASH, status: 0 });
    const deposit = makeTransaction("deposit", pendingInfo());

    const result = await waitForCompletion(deposit);

    expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: L1_TRANSACTION_HASH });
    expect(getTransactionReceipt).toHaveBeenCalledWith(L2_TRANSACTION_HASH);
    expect(result.info).toStrictEqual({
      ...pendingInfo(),
      toTransactionHash: L2_TRANSACTION_HASH,
      failed: true,
      l2Failed: true,
      completed: true,
    });
    expect(deposit.info).toStrictEqual(pendingInfo());
  });

  it("completes the deposit when its L2 transaction succeeded", async () => {
    getTransactionReceipt.mockResolvedValue({ hash: L2_TRANSACTION_HASH, status: 1 });

    const result = await waitForCompletion(makeTransaction("deposit", pendingInfo()));

    expect(result.info).toStrictEqual({
      ...pendingInfo(),
      toTransactionHash: L2_TRANSACTION_HASH,
      completed: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the deposit pending while its L1 transaction is not mined and checks it again", async () => {
    vi.useFakeTimers();
    waitForTransactionReceipt.mockRejectedValueOnce(
      new WaitForTransactionReceiptTimeoutError({ hash: L1_TRANSACTION_HASH })
    );
    getTransactionReceipt.mockResolvedValue({ hash: L2_TRANSACTION_HASH, status: 1 });

    const result = waitForCompletion(makeTransaction("deposit", pendingInfo()));
    await vi.advanceTimersByTimeAsync(15_000);

    expect(await result).toMatchObject({ info: { completed: true, toTransactionHash: L2_TRANSACTION_HASH } });
    expect((await result).info).not.toHaveProperty("failed");
    expect(waitForTransactionReceipt).toHaveBeenCalledTimes(2);
  });

  // An RPC error is not a deposit failure, whatever its message says
  it.each([
    ["the L1 receipt", () => waitForTransactionReceipt.mockRejectedValue(new Error("HTTP request failed."))],
    [
      "the L2 receipt",
      () => getTransactionReceipt.mockRejectedValue(new Error("could not coalesce error: transaction lookup failed")),
    ],
  ])("does not mark the deposit failed when reading %s fails", async (_, failRequest) => {
    failRequest();
    const deposit = makeTransaction("deposit", pendingInfo());

    await expect(waitForCompletion(deposit)).rejects.toThrow();
    expect(deposit.info).toStrictEqual(pendingInfo());
  });

  it("marks the deposit failed when its L1 transaction made no deposit request", async () => {
    // e.g. the deposit was cancelled in the wallet and the receipt is of the cancelling transaction
    waitForTransactionReceipt.mockResolvedValue({ status: "success", logs: [] });

    const result = await waitForCompletion(makeTransaction("deposit", pendingInfo()));

    expect(result.info).toStrictEqual({ ...pendingInfo(), failed: true, completed: true });
    expect(getTransactionReceipt).not.toHaveBeenCalled();
  });

  // Some nodes do not report "failed" in the transaction details of a reverted transaction
  it("marks the withdrawal failed when its receipt has a failed status", async () => {
    getTransactionReceipt.mockResolvedValue({ hash: L2_TRANSACTION_HASH, status: 0 });
    getTransactionDetails.mockResolvedValue({ status: "verified" });
    const withdrawal = { ...makeTransaction("withdrawal", pendingInfo()), transactionHash: L2_TRANSACTION_HASH };

    const result = await waitForCompletion(withdrawal);

    expect(getTransactionReceipt).toHaveBeenCalledWith(L2_TRANSACTION_HASH);
    expect(result.info).toStrictEqual({
      ...pendingInfo(),
      withdrawalFinalizationAvailable: false,
      failed: true,
      completed: true,
    });
  });

  // Some nodes do not report "failed" in the transaction details of a reverted transaction
  it("marks the transfer failed when its receipt has a failed status", async () => {
    getTransactionReceipt.mockResolvedValue({ hash: L2_TRANSACTION_HASH, status: 0 });
    getTransactionDetails.mockResolvedValue({ status: "included" });
    const transfer = { ...makeTransaction("transfer", pendingInfo()), transactionHash: L2_TRANSACTION_HASH };

    const result = await waitForCompletion(transfer);

    expect(getTransactionReceipt).toHaveBeenCalledWith(L2_TRANSACTION_HASH);
    expect(result.info).toStrictEqual({ ...pendingInfo(), failed: true, completed: true });
  });
});

// A claim made before claim receipts were checked could be saved as completed although it reverted or was cancelled
describe("withdrawal claimed in this browser", () => {
  const CLAIM_HASH = `0x${"d".repeat(64)}`;
  const WITHDRAWAL_HASH = `0x${"e".repeat(64)}`;
  const claimedWithdrawal = (info: Partial<TransactionInfo["info"]> = {}, token = {}): TransactionInfo => ({
    ...makeTransaction("withdrawal", {
      completed: true,
      withdrawalFinalizationAvailable: true,
      toTransactionHash: CLAIM_HASH,
      ...info,
    }),
    token: { ...makeTransaction("withdrawal", pendingInfo()).token, ...token },
    transactionHash: WITHDRAWAL_HASH,
  });

  let store: ReturnType<typeof useZkSyncTransactionStatusStore>;
  beforeEach(() => {
    isWithdrawalFinalized.mockReset();
    getTransactionDetails.mockReset();
    getTransactionReceipt.mockReset();
    store = useZkSyncTransactionStatusStore();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const saved = () => store.getTransaction(WITHDRAWAL_HASH)!.info;

  it("becomes claimable again when the withdrawal is not finalized", async () => {
    isWithdrawalFinalized.mockResolvedValue(false);
    store.saveTransaction(claimedWithdrawal());

    const result = await store.verifyClaimedWithdrawal(claimedWithdrawal());

    const claimable = { completed: false, withdrawalFinalizationAvailable: true, toTransactionHash: undefined };
    expect(result.info).toMatchObject(claimable);
    expect(saved()).toMatchObject(claimable);
    expect(isWithdrawalFinalized).toHaveBeenCalledWith(WITHDRAWAL_HASH);
  });

  it("stays completed when the withdrawal is finalized and is not checked again", async () => {
    isWithdrawalFinalized.mockResolvedValue(true);
    store.saveTransaction(claimedWithdrawal());

    await store.verifyClaimedWithdrawal(claimedWithdrawal());
    expect(saved()).toMatchObject({ completed: true, toTransactionHash: CLAIM_HASH, claimVerified: true });

    await store.verifyClaimedWithdrawal(store.getTransaction(WITHDRAWAL_HASH)!);
    expect(isWithdrawalFinalized).toHaveBeenCalledTimes(1);
  });

  it("is left as it is when the check fails and is checked again next time", async () => {
    isWithdrawalFinalized.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce(true);
    store.saveTransaction(claimedWithdrawal());

    await store.verifyClaimedWithdrawal(claimedWithdrawal());
    expect(saved()).toStrictEqual(claimedWithdrawal().info);

    await store.verifyClaimedWithdrawal(claimedWithdrawal());
    expect(saved()).toMatchObject({ completed: true, claimVerified: true });
  });

  it.each<[string, TransactionInfo]>([
    ["completed without a claim from this browser", claimedWithdrawal({ toTransactionHash: undefined })],
    ["already verified", claimedWithdrawal({ claimVerified: true })],
    ["claimed through a custom bridge", claimedWithdrawal({}, { l1BridgeAddress: `0x${"4".repeat(40)}` })],
  ])("is not checked when %s", async (_, withdrawal) => {
    store.saveTransaction(withdrawal);

    expect(await store.verifyClaimedWithdrawal(withdrawal)).toBe(withdrawal);
    expect(isWithdrawalFinalized).not.toHaveBeenCalled();
  });

  it("is shown as claimable on its transaction page when it is not finalized", async () => {
    vi.useFakeTimers();
    isWithdrawalFinalized.mockResolvedValue(false);
    store.saveTransaction(claimedWithdrawal());

    // The page keeps waiting until the withdrawal is claimed
    store.waitForCompletion(store.getTransaction(WITHDRAWAL_HASH)!);
    await vi.advanceTimersByTimeAsync(0);

    expect(saved()).toMatchObject({
      completed: false,
      withdrawalFinalizationAvailable: true,
      toTransactionHash: undefined,
    });
  });

  it("returns a verified claim from waitForCompletion without an RPC call", async () => {
    const withdrawal = claimedWithdrawal({ claimVerified: true });

    expect(await store.waitForCompletion(withdrawal)).toBe(withdrawal);
    expect(isWithdrawalFinalized).not.toHaveBeenCalled();
    expect(getTransactionDetails).not.toHaveBeenCalled();
  });
});

describe("DepositSubmitted", () => {
  const stubs = {
    CommonHeightTransition: heightTransitionStub,
    TransactionProgress: stub(
      (props) => h("div", { "data-progress": props.failed ? "failed" : props.completed ? "completed" : "in-progress" }),
      ["completed", "failed"]
    ),
    EcosystemBlock: slotStub("div"),
    CommonButton: slotStub("button"),
  };
  // isBaseTokenDeposit is undefined until the tokens are loaded
  const renderL2Failure = async (isBaseTokenDeposit: boolean | undefined) => {
    const transaction = makeTransaction("deposit", {
      toTransactionHash: L2_TRANSACTION_HASH,
      failed: true,
      l2Failed: true,
      completed: true,
    });
    const { html, headline } = await renderTemplate(
      "views/transactions/DepositSubmitted.vue",
      { transaction, makeAnotherTransaction: undefined },
      () => ({
        eraNetwork: { displaySettings: {} },
        blockExplorerUrl: "https://explorer.test",
        l1BlockExplorerUrl: "https://l1-explorer.test",
        isBaseTokenDeposit,
      }),
      stubs
    );
    return {
      headline,
      message: toText(html.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ""),
      links: [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]),
      progress: html.match(/data-progress="([^"]+)"/)?.[1],
    };
  };

  const L2_FAILURE_MESSAGE = `The deposit transaction succeeded on ${L1_LABEL} but failed on ${L2_LABEL}, so your funds were not delivered to the recipient.`;
  const CLAIM_FAILED_DEPOSIT_DOCS =
    "https://docs.zksync.io/zksync-protocol/contracts/l1-contracts/l1-ecosystem-contracts#claiming-failed-deposits";

  it.each([
    ["the base token", true, `The deposited amount, minus fees, was refunded to the sender's address on ${L2_LABEL}.`],
    ["another token", false, `The funds have to be recovered on ${L1_LABEL} by claiming the failed deposit.`],
    [
      "a token that is not loaded yet",
      undefined,
      `Depending on the token, the funds are refunded to the sender's address on ${L2_LABEL} or have to be recovered on ${L1_LABEL} by claiming the failed deposit.`,
    ],
  ])("shows the L2 failure and how to recover the funds of %s", async (_, isBaseTokenDeposit, recovery) => {
    const result = await renderL2Failure(isBaseTokenDeposit);

    expect(result.headline).toBe("Transaction failed");
    expect(result.message).toBe(`${L2_FAILURE_MESSAGE} ${recovery}`);
    expect(result.links).toStrictEqual(isBaseTokenDeposit ? [] : [CLAIM_FAILED_DEPOSIT_DOCS]);
    expect(result.progress).toBe("failed");
  });
});
