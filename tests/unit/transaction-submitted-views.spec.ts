import { describe, expect, it } from "vitest";
import { computed, h } from "vue";

import { heightTransitionStub, renderTemplate, slotStub, stub } from "./helpers/render-template";

import type { TransactionInfo } from "@/store/zksync/transactionStatus";

type Info = TransactionInfo["info"];
type Props = { transaction: TransactionInfo; makeAnotherTransaction: undefined };

const L2_LABEL = "ZKsync Test Chain";
const L1_LABEL = "Ethereum Test";

const eraNetwork = { name: L2_LABEL, l1Network: { name: L1_LABEL }, displaySettings: {} };

const stubs = {
  CommonHeightTransition: heightTransitionStub,
  TransactionProgress: stub(
    (props, slots) =>
      h(
        "div",
        { "data-progress": props.failed ? "failed" : props.completed ? "completed" : "in-progress" },
        slots["to-button"]?.()
      ),
    ["completed", "failed"]
  ),
  TransactionEthereumTransactionFooter: stub((_, slots) => h("div", slots["after-checks"]?.())),
  CommonButton: slotStub("button"),
  CommonAlert: slotStub("div"),
  CommonErrorBlock: slotStub("div"),
  CommonSpinner: slotStub("span"),
  CommonContentLoader: slotStub("span"),
  TransactionFeeDetails: slotStub("div"),
  TransactionButtonUnderlineConfirmTransaction: slotStub("div"),
};

const l2Destination = { key: "era", label: L2_LABEL, iconUrl: "" };
const l1Destination = { key: "ethereum", label: L1_LABEL, iconUrl: "" };

const makeTransaction = (type: TransactionInfo["type"], info: Info): TransactionInfo =>
  ({
    type,
    token: {
      address: "0x000000000000000000000000000000000000800A",
      l1Address: "0x0000000000000000000000000000000000000000",
      symbol: "ETH",
      decimals: 18,
      amount: "1",
    },
    from: { address: "0x1111111111111111111111111111111111111111", destination: l2Destination },
    to: {
      address: "0x2222222222222222222222222222222222222222",
      destination: type === "withdrawal" ? l1Destination : l2Destination,
    },
    transactionHash: `0x${"a".repeat(64)}`,
    timestamp: new Date(0).toISOString(),
    info,
  } as TransactionInfo);

const render = async (
  view: string,
  transaction: TransactionInfo,
  bindings: (props: Props) => Record<string, unknown>
) => {
  const { html, ...result } = await renderTemplate(
    `views/transactions/${view}.vue`,
    { transaction, makeAnotherTransaction: undefined },
    bindings,
    stubs
  );
  return { ...result, progress: html.match(/data-progress="([^"]+)"/)?.[1] };
};

// Template bindings of WithdrawalSubmitted.vue's script setup on a network with manual claiming
const withdrawalBindings = (props: Props) => {
  const withdrawalManualFinalizationRequired = computed(() => !props.transaction.info.completed);
  const withdrawalFinalizationAvailable = computed(
    () => withdrawalManualFinalizationRequired.value && props.transaction.info.withdrawalFinalizationAvailable
  );
  return {
    isCustomNode: false,
    eraNetwork,
    withdrawalManualFinalizationRequired,
    withdrawalFinalizationAvailable,
    isCustomBridgeToken: false,
    ExclamationTriangleIcon: "svg",
    ZKSYNC_WITHDRAWAL_DELAY: "https://docs.test/withdrawal-delay",
    blockExplorerUrl: "https://explorer.test",
    l1BlockExplorerUrl: "https://l1-explorer.test",
    onboardStore: { setCorrectNetwork: () => undefined },
    connectorName: "Injected",
    isCorrectNetworkSet: true,
    feeToken: undefined,
    fee: "21000000000000",
    feeError: undefined,
    feeLoading: false,
    retryFeeEstimate: () => undefined,
    finalizeTransactionStatus: "not-started",
    finalizeError: undefined,
    finalizeTransactionHash: undefined,
    continueButtonDisabled: false,
    buttonContinue: () => undefined,
    TransitionPrimaryButtonText: {},
  };
};

describe("TransferSubmitted", () => {
  it("shows the failed state for a failed transaction", async () => {
    const result = await render(
      "TransferSubmitted",
      makeTransaction("transfer", { completed: true, failed: true }),
      () => ({ blockExplorerUrl: "https://explorer.test" })
    );

    expect(result.headline).toBe("Transaction failed");
    expect(result.text).toContain(`The transaction failed on ${L2_LABEL}. Your funds were not sent.`);
    expect(result.text).not.toContain("Transaction completed");
    expect(result.text).not.toContain("Your funds will be available");
    expect(result.progress).toBe("failed");
  });
});

describe("WithdrawalSubmitted", () => {
  const renderWithdrawal = (info: Info) =>
    render("WithdrawalSubmitted", makeTransaction("withdrawal", info), withdrawalBindings);

  it("shows the failed state for a failed withdrawal", async () => {
    const result = await renderWithdrawal({ completed: true, failed: true, withdrawalFinalizationAvailable: false });

    expect(result.headline).toBe("Transaction failed");
    expect(result.text).toContain(`The withdrawal transaction failed on ${L2_LABEL}. Your funds were not withdrawn.`);
    expect(result.text).not.toContain("Transaction completed");
    expect(result.text).not.toContain("Your funds will be available");
    expect(result.text.toLowerCase()).not.toContain("claim");
    expect(result.progress).toBe("failed");
  });

  it("keeps the claimable state unchanged", async () => {
    const result = await renderWithdrawal({ completed: false, withdrawalFinalizationAvailable: true });

    expect(result.headline).toBe("Transaction submitted");
    expect(result.text).toContain(`Your funds will be available on ${L1_LABEL} after you claim the withdrawal.`);
    expect(result.text).toContain("You can claim your withdrawal now.");
    expect(result.text).toContain("Claim withdrawal");
    expect(result.text).not.toContain("failed");
  });
});
