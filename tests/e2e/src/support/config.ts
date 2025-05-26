import path from "path";
import * as dotenv from "dotenv";

import type { LaunchOptions } from "@playwright/test";
import { NetworkSwitcher } from "../data/data";

dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const browserOptions: LaunchOptions = {
  slowMo: 10,
  devtools: true,
  headless: false,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--disable-web-security"],
};

export const wallet = {
  _1_public_key: process.env.E2E_WALLET_1_MAIN_PUB_KEY || "undefined",
  _2_public_key: process.env.E2E_WALLET_2_SECOND_PUB_KEY || "undefined",
  _0_public_key: process.env.E2E_WALLET_0_EMPTY_PUB_KEY || "undefined",
  secret: process.env.E2E_WALLET_SECRET_PK || "undefined", // key for wallets to decrypt
  salt: process.env.E2E_WALLET_SALT_IV || "undefined",
  _1: process.env.E2E_WALLET_1_MAIN || "undefined",
  _2: process.env.E2E_WALLET_2_SECOND || "undefined",
  _0: process.env.E2E_WALLET_0_EMPTY || "undefined",
  password: process.env.E2E_WALLET_PASSWORD_MM || "undefined", // password MM
};

export const config = {
  browser: process.env.BROWSER || "chromium",
  browserOptions,
  BASE_URL: process.env.TARGET_ENV || "http://localhost:3000",
  METAMASK_VERSION: process.env.METAMASK_VERSION || "11.14.1",
  IMG_THRESHOLD: { threshold: 0.4 },
  mainWindowSize: { width: 1280, height: 720 },
  popUpWindowSize: { width: 355, height: 500 },
  DAPP_NETWORK: NetworkSwitcher.zkSyncEraSepolia,
  headless: false,
  slowMo: 10,
  defaultTimeout: { timeout: 6 * 1000 },
  minimalTimeout: { timeout: 1 * 1000 },
  increasedTimeout: { timeout: 15 * 1000 },
  extraTimeout: { timeout: 30 * 1000 },
  stepTimeout: { timeout: 60 * 1000 },
  stepExtraTimeout: { timeout: 180 * 1000 },
  feeLimitations: true,
  feeBoundaryLevel: 0.2, // in ETH
  networkL1: "goerli",
  networkL2: "https://testnet.era.zksync.dev",
  thresholdBalance: 0.6,
  preThresholdBalance: 0.9,
  matterMostURL: "most.matter-labs.io",
};
