import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";
import { parse } from "vue/compiler-sfc";
import { utils } from "zksync-ethers";

import usePromise from "@/composables/usePromise";
import useTimedCache from "@/composables/useTimedCache";
import useFee from "@/composables/zksync/deposit/useFee";
import { formatError } from "@/utils/formatters";
import { calculateFee, retry } from "@/utils/helpers";

import type { Token } from "@/types";

vi.mock("@/composables/useSentryLogger", () => ({ useSentryLogger: () => ({ captureException: () => undefined }) }));

const SENDER = "0x1111111111111111111111111111111111111111";
const OTHER_SENDER = "0x2222222222222222222222222222222222222222";
const RECIPIENT = "0x3333333333333333333333333333333333333333";

describe("fee estimate watcher", () => {
  // Sources of the watcher that resets the fee and estimates it again
  const feeWatcherSources = (file: string) => {
    const source = readFileSync(fileURLToPath(new URL(`../../${file}`, import.meta.url)), "utf8");
    const script = parse(source).descriptor.scriptSetup?.content ?? "";
    return script.match(/watch\(\s*\[([^\]]*)\],\s*\(\)\s*=>\s*\{\s*resetFee\(\);\s*estimate\(\);/)?.[1];
  };

  it.each(["views/transactions/Transfer.vue", "views/transactions/Deposit.vue"])(
    "estimates the fee again when the recipient changes in %s",
    (file) => {
      expect(feeWatcherSources(file)).toContain("() => transaction.value?.to.address");
    }
  );
});

describe("deposit fee", () => {
  let account = SENDER;
  // The L1 signer belongs to the connected account, so the estimate depends on the sender
  const getFullRequiredDepositFee = vi.fn(() =>
    Promise.resolve({ l1GasLimit: 100000n, l2GasLimit: account === SENDER ? 700000n : 900000n, baseCost: 1n })
  );

  beforeAll(() => {
    vi.stubGlobal("ref", ref);
    vi.stubGlobal("computed", computed);
    vi.stubGlobal("usePromise", usePromise);
    vi.stubGlobal("useTimedCache", useTimedCache);
    vi.stubGlobal("retry", retry);
    vi.stubGlobal("calculateFee", calculateFee);
    vi.stubGlobal("useOnboardStore", () => ({ getPublicClient: () => ({ getGasPrice: () => Promise.resolve(1n) }) }));
    vi.stubGlobal("useZkSyncWalletStore", () => ({
      getL1VoidSigner: () => Promise.resolve({ getFullRequiredDepositFee }),
    }));
    vi.stubGlobal("useZkSyncProviderStore", () => ({
      requestProvider: () => Promise.resolve({ isEthBasedChain: () => Promise.resolve(true) }),
    }));
  });

  it("estimates the fee again for another sender with the same recipient and token", async () => {
    const eth: Token = { address: utils.ETH_ADDRESS, symbol: "ETH", decimals: 18 };
    const { fee, estimateFee, resetFee } = useFee(ref([eth]), ref([]));

    await estimateFee(RECIPIENT, eth.address, SENDER);
    expect(fee.value?.l2GasLimit).toBe(700000n);

    // Switching the account resets the fee and estimates it for the new sender
    account = OTHER_SENDER;
    resetFee();
    await estimateFee(RECIPIENT, eth.address, OTHER_SENDER);

    expect(getFullRequiredDepositFee).toHaveBeenCalledTimes(2);
    expect(fee.value?.l2GasLimit).toBe(900000n);
  });
});

describe("deposit fee when the token changes during an estimate", () => {
  const USDC = "0x4444444444444444444444444444444444444444";
  const eth: Token = { address: utils.ETH_ADDRESS, symbol: "ETH", decimals: 18 };
  const ethFee = { l1GasLimit: 100000n, l2GasLimit: 700000n, baseCost: 1n, gasPrice: 1n };
  const ERC20_L1_GAS_LIMIT = BigInt(utils.L1_RECOMMENDED_MIN_ERC20_DEPOSIT_GAS_LIMIT);

  type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: Error) => void };
  const defer = <T>(): Deferred<T> => {
    const deferred = {} as Deferred<T>;
    deferred.promise = new Promise<T>((resolve, reject) => Object.assign(deferred, { resolve, reject }));
    return deferred;
  };
  const flush = () => new Promise((resolve) => setTimeout(resolve));

  let ethEstimate: Deferred<typeof ethFee>;
  let gasPrice: Deferred<bigint>;
  beforeEach(() => {
    ethEstimate = defer();
    gasPrice = defer();
    vi.stubGlobal("formatError", formatError);
    vi.stubGlobal("useOnboardStore", () => ({ getPublicClient: () => ({ getGasPrice: () => gasPrice.promise }) }));
    vi.stubGlobal("useZkSyncWalletStore", () => ({
      getL1VoidSigner: () => Promise.resolve({ getFullRequiredDepositFee: () => ethEstimate.promise }),
    }));
  });

  // The ETH estimate is started first, then the token is switched to USDC like the fee watcher of Deposit.vue does
  const switchToUsdcDuringEthEstimate = async () => {
    const deposit = useFee(ref([eth]), ref([]));
    deposit.estimateFee(RECIPIENT, eth.address, SENDER).catch(() => undefined);
    await flush();
    deposit.resetFee();
    const usdcEstimate = deposit.estimateFee(RECIPIENT, USDC, SENDER);
    await flush();
    return { ...deposit, usdcEstimate };
  };

  it("keeps the USDC fee when the ETH estimate settles after it", async () => {
    const { fee, inProgress, usdcEstimate } = await switchToUsdcDuringEthEstimate();
    gasPrice.resolve(10n);
    await usdcEstimate;
    expect(fee.value).toStrictEqual({ l1GasLimit: ERC20_L1_GAS_LIMIT, gasPrice: 13n });

    ethEstimate.resolve(ethFee);
    await flush();
    expect(fee.value).toStrictEqual({ l1GasLimit: ERC20_L1_GAS_LIMIT, gasPrice: 13n });
    expect(fee.value?.l2GasLimit).toBeUndefined();
    expect(inProgress.value).toBe(false);
  });

  it("stays in progress until the USDC estimate settles when the ETH estimate settles first", async () => {
    const { fee, inProgress, usdcEstimate } = await switchToUsdcDuringEthEstimate();
    ethEstimate.resolve(ethFee);
    await flush();
    expect(fee.value).toBeUndefined();
    expect(inProgress.value).toBe(true);

    gasPrice.resolve(10n);
    await usdcEstimate;
    expect(fee.value).toStrictEqual({ l1GasLimit: ERC20_L1_GAS_LIMIT, gasPrice: 13n });
    expect(inProgress.value).toBe(false);
  });

  it("does not show the error of the ETH estimate for USDC", async () => {
    const { fee, error, usdcEstimate } = await switchToUsdcDuringEthEstimate();
    ethEstimate.reject(new Error("execution reverted"));
    gasPrice.resolve(10n);
    await usdcEstimate;
    await flush();

    expect(error.value).toBeUndefined();
    expect(fee.value).toStrictEqual({ l1GasLimit: ERC20_L1_GAS_LIMIT, gasPrice: 13n });
  });
});
