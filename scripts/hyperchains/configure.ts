/* eslint-disable no-console */
/* 
  This file will look for hyperchain configuration files on the zksync-era repo
  and generate a /hyperchains/config.json file for the Portal.
*/
import { parse as envParse } from "dotenv";
import { prompt } from "enquirer";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join as pathJoin, parse as pathParse } from "path";

import { generateNetworkConfig, logUserInfo, promptNetworkReplacement } from "./utils";

import type { Network } from "./common";
import type { Token } from "../../types";

const rootPath = process.env.ZKSYNC_HOME;
if (!rootPath) {
  console.error("Please set ZKSYNC_HOME environment variable to contain path to your zksync-era repo.");
  process.exit(1);
}

const envsDirectory = pathJoin(rootPath, "/etc/env");
const tokensDirectory = pathJoin(rootPath, "/etc/tokens");

const configureHyperchainInfo = async () => {
  console.log("Starting Hyperchain configuration setup...\n");

  const network = await promptNetworkEnv();
  const envName = network.key;
  await promptNetworkInfo(network);
  await promptNetworkReplacement(network);

  generateNetworkConfig(network, getTokensFromDirectory(pathJoin(tokensDirectory, `${envName}.json`)));

  logUserInfo();
};

/* Utils */
const createNetworkFromEnv = (envPath: string): Network => {
  const env = envParse(readFileSync(envPath));
  const baseName = pathParse(envPath).name;

  const l1ChainName = env.CHAIN_ETH_NETWORK.charAt(0).toUpperCase() + env.CHAIN_ETH_NETWORK.slice(1);
  return {
    id: Number(env.CHAIN_ETH_ZKSYNC_NETWORK_ID),
    key: baseName,
    name: env.CHAIN_ETH_ZKSYNC_NETWORK,
    rpcUrl: env.API_WEB3_JSON_RPC_HTTP_URL,
    l1Network: {
      id: Number(env.ETH_CLIENT_CHAIN_ID),
      name: l1ChainName === "Localhost" ? "Localhost L1" : l1ChainName,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: [env.ETH_CLIENT_WEB3_URL] },
        public: { http: [env.ETH_CLIENT_WEB3_URL] },
      },
    },
  };
};
const getTokensFromDirectory = (directoryPath: string): Token[] => {
  try {
    return JSON.parse(readFileSync(directoryPath).toString());
  } catch {
    return [];
  }
};

/* Prompts */
const promptNetworkEnv = async () => {
  const getEnvsFromDirectory = (directoryPath: string): string[] => {
    if (existsSync(directoryPath)) {
      const envs = readdirSync(directoryPath)
        .map((fullFileName) => pathParse(fullFileName))
        .filter((file) => {
          if (!file.ext.endsWith(".env")) return false;
          if (!file.name) return false;
          if (file.base === ".init.env") return false;
          return true;
        })
        .map((file) => file.name);
      if (!envs.length) {
        console.error("No environment files found in your zksync-era repo. Please set up your hyperchain first.");
        process.exit(1);
      }
      return envs;
    } else {
      console.error("No .env files available for provided directory");
      process.exit(1);
    }
  };

  const { selectedEnv }: { selectedEnv: string } = await prompt([
    {
      message: "Which environment do you want to use?",
      name: "selectedEnv",
      type: "select",
      choices: getEnvsFromDirectory(envsDirectory).sort(),
    },
  ]);

  return createNetworkFromEnv(pathJoin(envsDirectory, `${selectedEnv}.env`));
};
const promptNetworkInfo = async (network: Network) => {
  const { name, l1NetworkName }: { name: string; l1NetworkName: string } = await prompt([
    {
      message: "Displayed network name",
      name: "name",
      type: "input",
      initial: network.name,
      required: true,
    },
    {
      message: "Displayed L1 network name",
      name: "l1NetworkName",
      type: "input",
      initial: network.l1Network.name,
      required: true,
    },
  ]);

  network.name = name;
  network.l1Network.name = l1NetworkName;
};

configureHyperchainInfo();
