import { type Config as HyperchainsConfig } from "@/scripts/hyperchains/common";
import type { BigNumberish } from "ethers";
import type { Address } from "zksync-ethers/build/types";

export type Hash = `0x${string}`;

export type TokenPrice = number | undefined;
export type Token = {
  address: string;
  l1Address?: string;
  name?: string;
  symbol: string;
  decimals: number;
  iconUrl?: string;
  price?: TokenPrice;
  isETH?: boolean;
};
export type TokenAmount = Token & { amount: BigNumberish };

export type TokenAllowance = { token: Address; allowance: bigint };

export declare namespace Api {
  namespace Response {
    type Collection<T> = {
      items: T[];
      meta: {
        currentPage: number;
        itemCount: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
      };
      links: {
        first: string;
        last: string;
        next: string;
        previous: string;
      };
    };

    type Token = {
      l2Address: string;
      l1Address: string | null;
      name: string | null;
      symbol: string | null;
      decimals: number;
      usdPrice: number | null;
      liquidity: number | null;
      iconURL: string | null;
    };

    type Transfer = {
      from: string;
      to: string;
      blockNumber: number;
      transactionHash: string | null;
      amount: string | null;
      token: Token | null;
      tokenAddress: string;
      timestamp: string;
      type: "deposit" | "transfer" | "withdrawal" | "fee" | "mint" | "refund";
    };

    type TokenAddress = {
      balance: string;
      token: null | Token;
    };

    type Balances = {
      [tokenAddress: string]: TokenAddress;
    };

    type Account = {
      type: "account";
      address: string;
      blockNumber: number;
      balances: Balances;
      sealedNonce: number;
      verifiedNonce: number;
    };

    type Contract = {
      type: "contract";
      address: string;
      blockNumber: number;
      balances: Balances;
      bytecode: string;
      creatorAddress: string;
      creatorTxHash: string;
      createdInBlockNumber: number;
      totalTransactions: number;
    };

    type Transaction = {
      hash: string;
      to: string;
      from: string;
      transactionIndex: number;
      data: string;
      value: string;
      fee: string;
      nonce: number;
      blockNumber: number;
      blockHash: string;
      gasPrice: string;
      gasLimit: string;
      gasUsed: string;
      gasPerPubdata: string | null;
      maxFeePerGas: string | null;
      maxPriorityFeePerGas: string | null;
      receivedAt: string;
      commitTxHash: string | null;
      proveTxHash: string | null;
      executeTxHash: string | null;
      isL1Originated: boolean;
      l1BatchNumber: number | null;
      isL1BatchSealed: boolean;
      status: "included" | "committed" | "proved" | "verified" | "failed";
      error: string | null;
      revertReason: string | null;
    };

    type Finalizer_Withdrawal = {
      tx_hash: string;
      token: string;
      amount: string;
      status: "NotFinalized" | "Finalized";
    };
  }
}

declare global {
  interface Window {
    rudderanalytics?: {
      load: (key: string, url: string) => void;
      ready: (callback: () => void) => void;
      page: () => void;
      track: (eventName: string, params?: unknown) => void;
      initialized: boolean;
    };
    "##runtimeConfig"?: {
      nodeType?: string;
      walletConnectProjectId?: string;
      ankrToken?: string;
      sentryDSN?: string;
      sentryENV?: string;
      screeningApiUrl?: string;
      analytics?: {
        rudder?: {
          key: string;
          dataplaneUrl: string;
        };
      };
      hyperchainsConfig?: HyperchainsConfig;
      gitCommitHash?: string;
      gitRepoUrl?: string;
    };
  }
}
