import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import usePromise from "@/composables/usePromise";
import { formatError } from "@/utils/formatters";
import { calculateFee, retry } from "@/utils/helpers";

import type { ZkSyncNetwork } from "@/data/networks";
import type { TransactionInfo } from "@/store/zksync/transactionStatus";

const { captureException, getFinalizeWithdrawalParams } = vi.hoisted(() => ({
  captureException: vi.fn(),
  getFinalizeWithdrawalParams: vi.fn(),
}));
vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException }) }));

const L1_NULLIFIER = "0x9999999999999999999999999999999999999999";
// The SDK wallet and the L1 asset router are replaced, the rest of the SDK is real
vi.mock("zksync-ethers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("zksync-ethers")>()),
  Wallet: class {
    getFinalizeWithdrawalParams = getFinalizeWithdrawalParams;
  },
}));
vi.mock("zksync-ethers/build/typechain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("zksync-ethers/build/typechain")>()),
  IL1AssetRouter__factory: { connect: () => ({ L1_NULLIFIER: () => Promise.resolve(L1_NULLIFIER) }) },
}));

const USER = "0x1111111111111111111111111111111111111111";
const SHARED_L1_BRIDGE = "0x2222222222222222222222222222222222222222";
const UNLISTED_BRIDGE = "0x5555555555555555555555555555555555555555";
const UNLISTED_TOKEN = "0x4444444444444444444444444444444444444444";
const WSTETH_L1 = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
const WSTETH_NATIVE_L2 = "0x703b52F2b28fEbcB60E1372858AF5b18849FE867";
const LIDO_L1_BRIDGE = "0x41527B2d03844dB6b0945f25702cB958b6d55989";
const DAI_L1 = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const DAI_L2 = "0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656";

const estimateContractGas = vi.fn();
const eraNetwork = ref<ZkSyncNetwork>();

const withdrawal = (token: Partial<TransactionInfo["token"]>) =>
  ({
    type: "withdrawal",
    token: { symbol: "TKN", decimals: 18, amount: "1", ...token },
    from: { address: USER, destination: { key: "era", label: "ZKsync", iconUrl: "" } },
    to: { address: USER, destination: { key: "ethereum", label: "Ethereum", iconUrl: "" } },
    transactionHash: `0x${"a".repeat(64)}`,
    timestamp: new Date(0).toISOString(),
    info: { completed: false, withdrawalFinalizationAvailable: true },
  } as TransactionInfo);

beforeAll(async () => {
  vi.stubGlobal("usePortalRuntimeConfig", () => ({}));
  const { chainList } = await import("@/data/networks");
  eraNetwork.value = chainList.find((network) => network.key === "mainnet")!;

  vi.stubGlobal("ref", ref);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("storeToRefs", (store: object) => store);
  vi.stubGlobal("usePromise", usePromise);
  vi.stubGlobal("retry", retry);
  vi.stubGlobal("formatError", formatError);
  vi.stubGlobal("calculateFee", calculateFee);
  vi.stubGlobal("useOnboardStore", () => ({
    isCorrectNetworkSet: ref(true),
    account: ref({ address: USER }),
    getPublicClient: () => ({ getGasPrice: () => Promise.resolve(1n), estimateContractGas }),
  }));
  vi.stubGlobal("useZkSyncProviderStore", () => ({
    eraNetwork,
    requestProvider: () =>
      Promise.resolve({
        getNetwork: () => Promise.resolve({ chainId: 324n }),
        getDefaultBridgeAddresses: () => Promise.resolve({ sharedL1: SHARED_L1_BRIDGE }),
      }),
  }));
  vi.stubGlobal("useZkSyncWalletStore", () => ({ getL1VoidSigner: () => Promise.resolve({}) }));
  vi.stubGlobal("useZkSyncTokensStore", () => ({ ethToken: ref(undefined), requestTokens: () => Promise.resolve() }));
});

beforeEach(() => {
  estimateContractGas.mockReset().mockResolvedValue(100_000n);
  getFinalizeWithdrawalParams.mockReset().mockResolvedValue({
    l1BatchNumber: 1,
    l2MessageIndex: 0,
    l2TxNumberInBlock: 0,
    message: "0x",
    proof: [],
    sender: "0x0000000000000000000000000000000000010003",
  });
});

const estimateClaim = async (transaction: TransactionInfo) => {
  const { default: useWithdrawalFinalization } = await import("@/composables/zksync/useWithdrawalFinalization");
  return useWithdrawalFinalization(computed(() => transaction)).estimateFee();
};
const claimTarget = () => {
  const [{ address, functionName }] = estimateContractGas.mock.calls.at(-1)!;
  return { address, functionName };
};

describe("withdrawal claim bridge", () => {
  it.each([
    [
      "sent from the Withdraw page",
      { address: WSTETH_NATIVE_L2, l1Address: WSTETH_L1, l1BridgeAddress: LIDO_L1_BRIDGE },
    ],
    // The block explorer has no L1 address for native wstETH
    ["imported from the block explorer", { address: WSTETH_NATIVE_L2 }],
  ])("claims a native wstETH withdrawal %s through the Lido bridge", async (_, token) => {
    await estimateClaim(withdrawal({ ...token, symbol: "wstETH" }));

    expect(claimTarget()).toStrictEqual({ address: LIDO_L1_BRIDGE, functionName: "finalizeWithdrawal" });
  });

  it("claims other withdrawals through the L1 nullifier", async () => {
    await estimateClaim(withdrawal({ address: DAI_L2, l1Address: DAI_L1, symbol: "DAI" }));

    expect(claimTarget()).toStrictEqual({ address: L1_NULLIFIER, functionName: "finalizeDeposit" });
  });

  it.each([
    ["a token without a custom bridge in the config", UNLISTED_TOKEN],
    ["native wstETH", WSTETH_NATIVE_L2],
  ])("does not claim through a bridge that is not in the config for %s", async (_, address) => {
    const transaction = withdrawal({ address, l1Address: WSTETH_L1, l1BridgeAddress: UNLISTED_BRIDGE });

    await expect(estimateClaim(transaction)).rejects.toThrow(
      "Claiming withdrawals of TKN through its custom bridge is not supported on ZKsync Era"
    );
    expect(estimateContractGas).not.toHaveBeenCalled();
  });

  it("does not use the Lido bridge on another chain", async () => {
    const network = eraNetwork.value!;
    eraNetwork.value = { ...network, id: 12345, name: "Custom chain" };
    try {
      await estimateClaim(withdrawal({ address: WSTETH_NATIVE_L2 }));
      expect(claimTarget()).toStrictEqual({ address: L1_NULLIFIER, functionName: "finalizeDeposit" });

      await expect(
        estimateClaim(withdrawal({ address: WSTETH_NATIVE_L2, l1BridgeAddress: LIDO_L1_BRIDGE }))
      ).rejects.toThrow("not supported on Custom chain");
    } finally {
      eraNetwork.value = network;
    }
  });
});
