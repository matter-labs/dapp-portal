import { beforeEach, describe, expect, it, vi } from "vitest";
import { computed, h, ref } from "vue";

import useWithdrawalFinalization from "@/composables/zksync/useWithdrawalFinalization";
import { formatError } from "@/utils/formatters";
import { retry } from "@/utils/helpers";

import { heightTransitionStub, renderTemplate, slotStub, stub, toText } from "./helpers/render-template";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";
import type { Hash } from "@/types";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException }) }));

const SENDER = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const CLAIM_HASH = `0x${"c".repeat(64)}` as Hash;
const SPED_UP_HASH = `0x${"d".repeat(64)}` as Hash;
const REPLACEMENT_HASH = `0x${"e".repeat(64)}` as Hash;
const L2_LABEL = "ZKsync Test Chain";
const L1_LABEL = "Ethereum Test";

const FAILED_MESSAGE = "The claim transaction failed and did not claim your withdrawal.";
const REPLACED_MESSAGE =
  "The claim transaction was cancelled or replaced in your wallet and did not claim your withdrawal.";

const transactionParams = {
  address: "0x3333333333333333333333333333333333333333",
  functionName: "finalizeDeposit",
  args: [{ chainId: 324n }],
};

const withdrawal = {
  type: "withdrawal",
  token: {
    address: "0x000000000000000000000000000000000000800A",
    l1Address: "0x0000000000000000000000000000000000000000",
    symbol: "ETH",
    decimals: 18,
    amount: "1000",
  },
  from: { address: SENDER, destination: { key: "era", label: L2_LABEL, iconUrl: "" } },
  to: { address: RECIPIENT, destination: { key: "ethereum", label: L1_LABEL, iconUrl: "" } },
  transactionHash: `0x${"a".repeat(64)}`,
  timestamp: new Date(0).toISOString(),
  info: { completed: false, withdrawalFinalizationAvailable: true },
} as TransactionInfo;

const writeContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const trackEvent = vi.fn();

type Replacement = { reason: "repriced" | "cancelled" | "replaced"; hash: Hash };
// Like viem: when the claim is replaced, it calls onReplaced and resolves with the receipt of the replacement
const mineClaim = (status: "success" | "reverted", replacement?: Replacement) =>
  waitForTransactionReceipt.mockImplementation(({ hash, onReplaced }) => {
    if (!replacement) return Promise.resolve({ status, transactionHash: hash });
    const transactionReceipt = { status, transactionHash: replacement.hash };
    onReplaced({
      reason: replacement.reason,
      replacedTransaction: { hash },
      transaction: { hash: replacement.hash },
      transactionReceipt,
    });
    return Promise.resolve(transactionReceipt);
  });

beforeEach(() => {
  captureException.mockReset();
  trackEvent.mockReset();
  writeContract.mockReset().mockResolvedValue(CLAIM_HASH);
  waitForTransactionReceipt.mockReset();

  vi.stubGlobal("ref", ref);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("storeToRefs", (store: object) => store);
  vi.stubGlobal("retry", retry);
  vi.stubGlobal("formatError", formatError);
  vi.stubGlobal("trackEvent", trackEvent);
  vi.stubGlobal("useOnboardStore", () => ({
    isCorrectNetworkSet: ref(true),
    account: ref({ address: SENDER }),
    getWallet: () => Promise.resolve({ writeContract }),
    getPublicClient: () => ({ waitForTransactionReceipt }),
  }));
  vi.stubGlobal("useZkSyncProviderStore", () => ({}));
  vi.stubGlobal("useZkSyncWalletStore", () => ({}));
  vi.stubGlobal("useZkSyncTokensStore", () => ({ ethToken: ref(undefined) }));
  // The fee estimation is not under test, it resolves with fixed finalization parameters
  vi.stubGlobal("usePromise", () => ({
    inProgress: ref(false),
    error: ref(undefined),
    execute: () => Promise.resolve({ transactionParams, gasPrice: 2n, gasLimit: 100_000n }),
  }));
});

type Finalization = ReturnType<typeof useWithdrawalFinalization>;
const createFinalization = () => useWithdrawalFinalization(computed(() => withdrawal));

// WithdrawalSubmitted.vue marks the withdrawal as completed only when the status is "done"
describe("useWithdrawalFinalization commitTransaction", () => {
  it("marks a claim sped up in the wallet as done with the new hash", async () => {
    mineClaim("success", { reason: "repriced", hash: SPED_UP_HASH });
    const finalization = createFinalization();
    await finalization.commitTransaction();

    expect(finalization.status.value).toBe("done");
    expect(finalization.error.value).toBeUndefined();
    expect(finalization.transactionHash.value).toBe(SPED_UP_HASH);
    expect(trackEvent).toHaveBeenCalledOnce();
  });

  it.each([
    ["a reverted claim", "reverted", undefined, FAILED_MESSAGE],
    ["a claim cancelled in the wallet", "success", { reason: "cancelled", hash: REPLACEMENT_HASH }, REPLACED_MESSAGE],
    [
      "a claim replaced by another transaction",
      "success",
      { reason: "replaced", hash: REPLACEMENT_HASH },
      REPLACED_MESSAGE,
    ],
  ] as const)("does not mark %s as done", async (_, status, replacement, message) => {
    mineClaim(status, replacement);
    const finalization = createFinalization();
    const receipt = await finalization.commitTransaction();

    expect(receipt).toBeUndefined();
    expect(finalization.status.value).toBe("not-started");
    expect(finalization.error.value?.message).toBe(message);
    expect(finalization.transactionHash.value).toBeUndefined();
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe("WithdrawalSubmitted claim error", () => {
  const stubs = {
    CommonHeightTransition: heightTransitionStub,
    TransactionProgress: stub(
      (props, slots) =>
        h("div", props.toTransactionHash ? { "data-to-hash": props.toTransactionHash } : {}, slots["to-button"]?.()),
      ["toTransactionHash"]
    ),
    TransactionEthereumTransactionFooter: stub((_, slots) => h("div", slots["after-checks"]?.())),
    CommonErrorBlock: slotStub("div", { "data-error-block": "" }),
    CommonButton: slotStub("button"),
    CommonAlert: slotStub("div"),
    CommonSpinner: slotStub("span"),
    CommonContentLoader: slotStub("span"),
    TransactionFeeDetails: slotStub("div"),
    TransactionButtonUnderlineConfirmTransaction: slotStub("div"),
  };

  // Template bindings of the claimable state, with the claim state taken from the composable
  const render = async (finalization: Finalization) => {
    const { html, text } = await renderTemplate(
      "views/transactions/WithdrawalSubmitted.vue",
      { transaction: withdrawal, makeAnotherTransaction: undefined },
      () => ({
        isCustomNode: false,
        eraNetwork: { name: L2_LABEL, l1Network: { name: L1_LABEL } },
        withdrawalManualFinalizationRequired: true,
        withdrawalFinalizationAvailable: true,
        isCustomBridgeToken: false,
        ExclamationTriangleIcon: "svg",
        ZKSYNC_WITHDRAWAL_DELAY: "https://docs.test/withdrawal-delay",
        blockExplorerUrl: "https://explorer.test",
        l1BlockExplorerUrl: "https://l1-explorer.test",
        onboardStore: {},
        connectorName: "Injected",
        isCorrectNetworkSet: true,
        feeToken: undefined,
        fee: "200000",
        feeError: undefined,
        feeLoading: false,
        retryFeeEstimate: () => undefined,
        finalizeTransactionStatus: finalization.status,
        finalizeTransactionHash: finalization.transactionHash,
        finalizeError: finalization.error,
        continueButtonDisabled: false,
        buttonContinue: () => undefined,
        TransitionPrimaryButtonText: {},
      }),
      stubs
    );
    return {
      text,
      errorBlocks: [...html.matchAll(/<div data-error-block[^>]*>([\s\S]*?)<\/div>/g)].map((match) => toText(match[1])),
      toTransactionHash: html.match(/data-to-hash="([^"]+)"/)?.[1],
    };
  };

  it("shows the error and the claim buttons again after a failed claim", async () => {
    mineClaim("success", { reason: "cancelled", hash: REPLACEMENT_HASH });
    const finalization = createFinalization();
    await finalization.commitTransaction();
    const result = await render(finalization);

    expect(result.errorBlocks).toEqual([REPLACED_MESSAGE]);
    expect(result.toTransactionHash).toBeUndefined();
    expect(result.text).toContain("Claim withdrawal");
    expect(result.text).not.toContain("Claiming withdrawal...");
  });
});
