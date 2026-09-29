import { encodeAbiParameters, encodeEventTopics, getAbiItem, type Abi, type AbiEvent, type Hash } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
