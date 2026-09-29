import { Interface } from "ethers";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref, watch } from "vue";
import { L1Signer, utils } from "zksync-ethers";
import IERC20 from "zksync-ethers/abi/IERC20.json";

import usePromise from "@/composables/usePromise";
import { formatError } from "@/utils/formatters";
import {
  AddressChainType,
  getBalancesWithCustomBridgeTokens,
  getDepositAllowanceSpender,
  isCustomBridgeDepositSupported,
  retry,
} from "@/utils/helpers";

import type { DepositFeeValues } from "@/composables/zksync/deposit/useFee";
import type { ZkSyncNetwork } from "@/data/networks";

vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException: () => undefined }) }));

const USER = "0x1111111111111111111111111111111111111111";
const SHARED_L1_BRIDGE = "0x2222222222222222222222222222222222222222";
const BASE_TOKEN = "0x3333333333333333333333333333333333333333";
const OTHER_TOKEN = "0x4444444444444444444444444444444444444444";
const OTHER_SPENDER = "0x5555555555555555555555555555555555555555";
const WSTETH_L1 = "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0";
const WSTETH_NATIVE_L2 = "0x703b52F2b28fEbcB60E1372858AF5b18849FE867";
const WSTETH_BRIDGED_L2 = "0xCafB42a2654C20cb3739F04243E925aa47302bec";
const LIDO_L1_BRIDGE = "0x41527B2d03844dB6b0945f25702cB958b6d55989";
const USDC_L1 = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const erc20 = new Interface(IERC20);

describe("getDepositAllowanceSpender", () => {
  let networks: Record<string, ZkSyncNetwork>;

  // L1 rows of the Deposit page, where custom bridge tokens get one row per L2 counterpart
  const balances = getBalancesWithCustomBridgeTokens(
    [
      { address: utils.ETH_ADDRESS, l1Address: utils.ETH_ADDRESS, symbol: "ETH", decimals: 18, amount: "1" },
      {
        address: WSTETH_L1,
        l1Address: WSTETH_L1,
        l2Address: WSTETH_BRIDGED_L2,
        symbol: "wstETH",
        decimals: 18,
        amount: "1",
      },
    ],
    AddressChainType.L1
  );
  const findToken = (l2Address: string) =>
    balances.find((token) => token.address === WSTETH_L1 && token.l2Address === l2Address)!;

  beforeAll(async () => {
    vi.stubGlobal("usePortalRuntimeConfig", () => ({}));
    const { chainList } = await import("@/data/networks");
    const era = chainList.find((network) => network.key === "mainnet")!;
    networks = {
      era,
      "ZKsync Gateway": chainList.find((network) => network.key === "gateway")!,
      "ZKsync Era Sepolia": chainList.find((network) => network.key === "sepolia")!,
      "another chain on Ethereum": { ...era, id: 12345, key: "custom-chain", name: "Custom chain" },
      "a network without L1": { ...era, l1Network: undefined },
    };
  });

  it("uses the Lido bridge for native wstETH on ZKsync Era", () => {
    const token = findToken(WSTETH_NATIVE_L2);
    expect(token.l1BridgeAddress).toBe(LIDO_L1_BRIDGE);
    expect(isCustomBridgeDepositSupported(token, networks.era)).toBe(true);
    expect(getDepositAllowanceSpender(token, SHARED_L1_BRIDGE, networks.era)).toBe(LIDO_L1_BRIDGE);
  });

  it("uses the shared bridge for bridged wstETH, which has the same L1 address", () => {
    const token = findToken(WSTETH_BRIDGED_L2);
    expect(getDepositAllowanceSpender(token, SHARED_L1_BRIDGE, networks.era)).toBe(SHARED_L1_BRIDGE);
  });

  it.each(["ZKsync Gateway", "ZKsync Era Sepolia", "another chain on Ethereum", "a network without L1"])(
    "rejects native wstETH on %s, which the Lido bridge does not deposit to",
    (key) => {
      const token = findToken(WSTETH_NATIVE_L2);
      const network = networks[key];
      expect(isCustomBridgeDepositSupported(token, network)).toBe(false);
      expect(() => getDepositAllowanceSpender(token, SHARED_L1_BRIDGE, network)).toThrow(
        `Deposits of wstETH through its custom bridge are not supported on ${network.name}`
      );
    }
  );
});

describe("useAllowance", () => {
  const readContract = vi.fn();
  let sentTransactions: { to: string; data: string }[];
  let baseToken: string;

  // Runs the SDK's approveERC20 and getDepositAllowanceParams against a stub L1 runner that records transactions
  const l1Signer = {
    _signerL1: () => ({
      provider: null,
      sendTransaction: (tx: { to: string; data: string }) => {
        sentTransactions.push(tx);
        return Promise.resolve({ ...tx, hash: `0x${String(sentTransactions.length).padStart(64, "0")}` });
      },
    }),
    getL1BridgeContracts: () => Promise.resolve({ shared: { getAddress: () => Promise.resolve(SHARED_L1_BRIDGE) } }),
    getBaseToken: () => Promise.resolve(baseToken),
    isETHBasedChain: () => Promise.resolve(baseToken === utils.ETH_ADDRESS_IN_CONTRACTS),
    _getDepositNonBaseTokenToNonETHBasedChainTx: () => Promise.resolve({ mintValue: 7n }),
    approveERC20: L1Signer.prototype.approveERC20,
    getDepositAllowanceParams: L1Signer.prototype.getDepositAllowanceParams,
  } as unknown as L1Signer;

  const decodeApprovals = () =>
    sentTransactions.map((tx) => {
      const [spender, amount] = erc20.decodeFunctionData("approve", tx.data);
      return { token: tx.to, spender, amount };
    });
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  const setup = async (tokenAddress: string, spender: string) => {
    const { default: useAllowance } = await import("@/composables/transaction/useAllowance");
    const allowance = useAllowance(
      ref(USER),
      ref(tokenAddress),
      () => Promise.resolve(spender),
      () => Promise.resolve(l1Signer)
    );
    await flush();
    return allowance;
  };

  beforeAll(() => {
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("watch", watch);
    vi.stubGlobal("usePromise", usePromise);
    vi.stubGlobal("retry", retry);
    vi.stubGlobal("formatError", formatError);
    vi.stubGlobal("useOnboardStore", () => ({
      getPublicClient: () => ({
        readContract,
        waitForTransactionReceipt: ({ hash }: { hash: string }) => Promise.resolve({ transactionHash: hash }),
      }),
    }));
  });

  beforeEach(() => {
    readContract.mockReset();
    readContract.mockResolvedValue(0n);
    sentTransactions = [];
    baseToken = utils.ETH_ADDRESS_IN_CONTRACTS;
  });

  it("reads and approves the allowance for the resolved spender", async () => {
    const { result, setAllowance } = await setup(WSTETH_L1, LIDO_L1_BRIDGE);
    expect(readContract).toHaveBeenCalledTimes(1);
    expect(readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ address: WSTETH_L1, functionName: "allowance", args: [USER, LIDO_L1_BRIDGE] })
    );

    readContract.mockResolvedValue(10n);
    await setAllowance(10n, {} as DepositFeeValues);

    expect(decodeApprovals()).toEqual([{ token: WSTETH_L1, spender: LIDO_L1_BRIDGE, amount: 10n }]);
    expect(readContract).toHaveBeenCalledTimes(2);
    expect(readContract).toHaveBeenLastCalledWith(expect.objectContaining({ args: [USER, LIDO_L1_BRIDGE] }));
    expect(result.value).toBe(10n);
  });

  it("sends the same approval as the SDK default for the shared bridge", async () => {
    const { setAllowance } = await setup(USDC_L1, SHARED_L1_BRIDGE);
    await setAllowance(5n, {} as DepositFeeValues);
    await l1Signer.approveERC20(USDC_L1, 5n);

    expect(sentTransactions).toHaveLength(2);
    expect(sentTransactions[0]).toEqual(sentTransactions[1]);
    expect(decodeApprovals()[0]).toEqual({ token: USDC_L1, spender: SHARED_L1_BRIDGE, amount: 5n });
  });

  it("sends every approval to the resolved spender when a deposit needs two approvals", async () => {
    baseToken = BASE_TOKEN;
    const { setAllowance } = await setup(OTHER_TOKEN, OTHER_SPENDER);
    await setAllowance(5n, {} as DepositFeeValues);

    expect(decodeApprovals()).toEqual([
      { token: BASE_TOKEN, spender: OTHER_SPENDER, amount: 7n },
      { token: OTHER_TOKEN, spender: OTHER_SPENDER, amount: 5n },
    ]);
  });

  it.each(["previous", "new"])(
    "shows the allowance for the new spender when another variant is selected during a read and the %s read settles first",
    async (settlesFirst) => {
      const reads: { spender: string; resolve: (allowance: bigint) => void }[] = [];
      readContract.mockImplementation(
        ({ args }: { args: string[] }) => new Promise((resolve) => reads.push({ spender: args[1], resolve }))
      );
      const nativeToken = { address: WSTETH_L1, l1BridgeAddress: LIDO_L1_BRIDGE };
      const bridgedToken = { address: WSTETH_L1, l1BridgeAddress: undefined };
      const selectedToken = ref<{ address: string; l1BridgeAddress?: string }>(nativeToken);

      const { default: useAllowance } = await import("@/composables/transaction/useAllowance");
      const { result, inProgress, requestAllowance, resetSetAllowance } = useAllowance(
        ref(USER),
        computed(() => selectedToken.value.address),
        () => Promise.resolve(selectedToken.value.l1BridgeAddress ?? SHARED_L1_BRIDGE),
        () => Promise.resolve(l1Signer)
      );
      // The allowance watcher of Deposit.vue
      watch(
        () => selectedToken.value.l1BridgeAddress,
        () => {
          requestAllowance({ force: true }).catch(() => undefined);
          resetSetAllowance();
        }
      );
      await flush();
      expect(reads.map(({ spender }) => spender)).toEqual([LIDO_L1_BRIDGE]);

      selectedToken.value = bridgedToken;
      await flush();
      expect(reads.map(({ spender }) => spender)).toEqual([LIDO_L1_BRIDGE, SHARED_L1_BRIDGE]);

      const [nativeRead, bridgedRead] = reads;
      for (const read of settlesFirst === "previous" ? [nativeRead, bridgedRead] : [bridgedRead, nativeRead]) {
        read.resolve(read === nativeRead ? 1n : 2n);
        await flush();
        // The allowance for the Lido bridge is never shown for bridged wstETH
        expect(result.value).not.toBe(1n);
      }
      expect(result.value).toBe(2n);
      expect(inProgress.value).toBe(false);
    }
  );

  it("does not keep the previous spender's allowance while the read for the new spender is in progress", async () => {
    const reads: { spender: string; resolve: (allowance: bigint) => void }[] = [];
    readContract.mockImplementation(
      ({ args }: { args: string[] }) => new Promise((resolve) => reads.push({ spender: args[1], resolve }))
    );
    const selectedToken = ref<{ address: string; l1BridgeAddress?: string }>({
      address: WSTETH_L1,
      l1BridgeAddress: LIDO_L1_BRIDGE,
    });

    const { default: useAllowance } = await import("@/composables/transaction/useAllowance");
    const { result, inProgress, requestAllowance } = useAllowance(
      ref(USER),
      computed(() => selectedToken.value.address),
      () => Promise.resolve(selectedToken.value.l1BridgeAddress ?? SHARED_L1_BRIDGE),
      () => Promise.resolve(l1Signer)
    );
    // The allowance watcher of Deposit.vue
    watch(
      () => selectedToken.value.l1BridgeAddress,
      () => {
        requestAllowance({ force: true }).catch(() => undefined);
      }
    );
    await flush();
    reads[0].resolve(1n);
    await flush();
    expect(result.value).toBe(1n);

    selectedToken.value = { address: WSTETH_L1, l1BridgeAddress: undefined };
    await flush();
    expect(inProgress.value).toBe(true);
    expect(result.value).toBeUndefined();

    reads[1].resolve(2n);
    await flush();
    expect(result.value).toBe(2n);
  });
});
