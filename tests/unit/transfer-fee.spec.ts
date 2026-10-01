import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import usePromise from "@/composables/usePromise";
import useTimedCache from "@/composables/useTimedCache";
import useFee, { type FeeEstimationParams } from "@/composables/zksync/useFee";
import { L2_ASSET_ROUTER_ADDRESS, L2_BASE_TOKEN_ADDRESS } from "@/utils/constants";
import { formatError } from "@/utils/formatters";
import { calculateFee, retry } from "@/utils/helpers";

import type { TokenAmount } from "@/types";
import type { Provider } from "zksync-ethers";

vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException: () => undefined }) }));
vi.mock("@wagmi/core", () => ({ estimateGas: vi.fn() }));
vi.mock("@/data/wagmi", () => ({ wagmiConfig: {} }));

const USER = "0x1111111111111111111111111111111111111111";
const RECIPIENT = "0x2222222222222222222222222222222222222222";
const DAI = "0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656";
const USDC = "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4";

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void };
const defer = <T>(): Deferred<T> => {
  const deferred = {} as Deferred<T>;
  deferred.promise = new Promise<T>((resolve, reject) => Object.assign(deferred, { resolve, reject }));
  return deferred;
};
const flush = () => new Promise((resolve) => setTimeout(resolve));

const balances = ref<TokenAmount[]>([
  { address: L2_BASE_TOKEN_ADDRESS, symbol: "ETH", decimals: 18, amount: "1000000000000000000" },
  { address: DAI, symbol: "DAI", decimals: 18, amount: "5000000000000000000" },
  { address: USDC, symbol: "USDC", decimals: 6, amount: "5000000" },
]);
const transferParams = (tokenAddress: string): FeeEstimationParams => ({
  type: "transfer",
  from: USER,
  to: RECIPIENT,
  tokenAddress,
  isNativeToken: false,
  assetId: null,
  amount: "1",
});

// Each token's balance read and gas estimate settle when the test decides
let balanceReads: Record<string, Deferred<bigint>>;
let gasEstimates: Record<string, Deferred<bigint>>;
const provider = {
  getBalance: (_address: string, _blockTag: string, token: string) => balanceReads[token].promise,
  getGasPrice: () => Promise.resolve(10n),
  estimateGasTransfer: ({ token }: { token: string }) => gasEstimates[token].promise,
} as unknown as Provider;

beforeAll(() => {
  vi.stubGlobal("ref", ref);
  vi.stubGlobal("computed", computed);
  vi.stubGlobal("usePromise", usePromise);
  vi.stubGlobal("useTimedCache", useTimedCache);
  vi.stubGlobal("retry", retry);
  vi.stubGlobal("calculateFee", calculateFee);
  vi.stubGlobal("formatError", formatError);
  vi.stubGlobal("L2_BASE_TOKEN_ADDRESS", L2_BASE_TOKEN_ADDRESS);
  vi.stubGlobal("L2_ASSET_ROUTER_ADDRESS", L2_ASSET_ROUTER_ADDRESS);
});

beforeEach(() => {
  balanceReads = { [DAI]: defer(), [USDC]: defer() };
  gasEstimates = { [DAI]: defer(), [USDC]: defer() };
});

// DAI is estimated first, then the token is switched to USDC like the fee watcher of Transfer.vue does.
// With daiGasEstimateRequested, the DAI estimate has already requested its gas estimate when the token is switched
const switchToUsdcDuringDaiEstimate = async ({ daiGasEstimateRequested = false } = {}) => {
  const transferFee = useFee(
    computed(() => USER),
    () => Promise.resolve(provider),
    ref({}),
    balances
  );
  transferFee.estimateFee(transferParams(DAI)).catch(() => undefined);
  await flush();
  if (daiGasEstimateRequested) {
    balanceReads[DAI].resolve(5n);
    await flush();
  }
  transferFee.resetFee();
  const usdcEstimate = transferFee.estimateFee(transferParams(USDC));
  await flush();
  return { ...transferFee, usdcEstimate };
};
const settleUsdcEstimate = async (usdcEstimate: Promise<void>) => {
  balanceReads[USDC].resolve(5_000_000n);
  gasEstimates[USDC].resolve(200_000n);
  await usdcEstimate;
};

describe("transfer fee when the token changes during an estimate", () => {
  it("keeps the USDC gas limit when the DAI estimate settles after it", async () => {
    const { gasLimit, gasPrice, inProgress, usdcEstimate } = await switchToUsdcDuringDaiEstimate({
      daiGasEstimateRequested: true,
    });
    await settleUsdcEstimate(usdcEstimate);

    gasEstimates[DAI].resolve(100_000n);
    await flush();

    expect(gasLimit.value).toBe(200_000n);
    expect(gasPrice.value).toBe(10n);
    expect(inProgress.value).toBe(false);
  });

  it("does not clear the USDC fee when the DAI estimate ends without a fee after it", async () => {
    const { gasLimit, usdcEstimate } = await switchToUsdcDuringDaiEstimate();
    await settleUsdcEstimate(usdcEstimate);

    // The DAI balance read returns 0, which ends an estimate without a fee
    balanceReads[DAI].resolve(0n);
    await flush();

    expect(gasLimit.value).toBe(200_000n);
  });

  it("stays in progress until the USDC estimate settles when the DAI estimate settles first", async () => {
    const { gasLimit, inProgress, usdcEstimate } = await switchToUsdcDuringDaiEstimate({
      daiGasEstimateRequested: true,
    });
    gasEstimates[DAI].resolve(100_000n);
    await flush();
    expect(gasLimit.value).toBeUndefined();
    expect(inProgress.value).toBe(true);

    await settleUsdcEstimate(usdcEstimate);
    expect(gasLimit.value).toBe(200_000n);
    expect(inProgress.value).toBe(false);
  });

  it("does not show the error of the DAI estimate for USDC", async () => {
    const { error, gasLimit, usdcEstimate } = await switchToUsdcDuringDaiEstimate();
    balanceReads[DAI].reject(new Error("execution reverted"));
    await settleUsdcEstimate(usdcEstimate);
    await flush();

    expect(error.value).toBeUndefined();
    expect(gasLimit.value).toBe(200_000n);
  });
});
