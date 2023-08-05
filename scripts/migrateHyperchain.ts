/* 
  This file will look for hyperchain configuration files on the zksync-era repo
  and generate a /hyperchains/config.json file for the Portal.
*/
import { parse as envParse } from "dotenv";
import { prompt } from "enquirer";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join as pathJoin, parse as pathParse } from "path";

import { ETH_L1_ADDRESS, ETH_L2_ADDRESS } from "../utils/constants";

import type { EraNetwork } from "../data/networks";
import type { Token } from "../types";

type Network = Omit<EraNetwork, "getTokens">;
type Config = { network: Network; tokens: Token[] }[];

const args = process.argv;
const rootPath = args[2] ?? "";

const configPath = pathJoin(__dirname, "../hyperchains/config.json");
const envsDirectory = pathJoin(rootPath, "/etc/env");
const tokensDirectory = pathJoin(rootPath, "/etc/tokens");

const migrateHyperchainInfo = async () => {
  console.log("Starting Hyperchain configuration setup...\n");

  if (!rootPath) {
    console.error(
      `Please provide the path to your zksync-era repo:
      npm run migrate:hyperchain <path_to_your_zksync-era_repo>`
    );
    return;
  }

  const network = await promptNetworkEnv();
  const envName = network.key;
  await promptNetworkInfo(network);
  await promptNetworkReplacement(network);

  await generateConfig(network, getTokensFromDirectory(pathJoin(tokensDirectory, `${envName}.json`)));

  console.log("\nConfig has been generated successfully!");
  console.log("You can find more info in /hyperchains/README.md\n");

  console.log("You can start Portal with your new config by running");
  console.log("npm run dev:node:hyperchain");
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
    shortName: env.CHAIN_ETH_ZKSYNC_NETWORK,
    rpcUrl: env.API_WEB3_JSON_RPC_HTTP_URL,
    l1Network: {
      id: Number(env.ETH_CLIENT_CHAIN_ID),
      name: l1ChainName === "Localhost" ? "Localhost L1" : l1ChainName,
      network: env.CHAIN_ETH_NETWORK,
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
const getConfig = (): Config => {
  return JSON.parse(readFileSync(configPath).toString());
};
const saveConfig = (config: Config) => {
  return writeFileSync(configPath, JSON.stringify(config, null, 2));
};

/* Prompts */
const promptNetworkEnv = async () => {
  const getEnvsFromDirectory = (directoryPath: string): string[] => {
    if (existsSync(directoryPath)) {
      return readdirSync(directoryPath)
        .map((fullFileName) => pathParse(fullFileName))
        .filter((file) => {
          if (!file.ext.endsWith(".env")) return false;
          if (!file.name) return false;
          if (file.base === ".init.env") return false;
          return true;
        })
        .map((file) => file.name);
    } else {
      console.error("No .env files available for provided directory");
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
  const { name, shortName, l1NetworkName }: { name: string; shortName: string; l1NetworkName: string } = await prompt([
    {
      message: "Displayed network name",
      name: "name",
      type: "input",
      initial: network.name,
    },
    {
      message: "Displayed network short name?",
      name: "shortName",
      type: "input",
      initial: network.shortName,
    },
    {
      message: "Displayed L1 network name?",
      name: "l1NetworkName",
      type: "input",
      initial: network.l1Network.name,
    },
  ]);

  network.name = name;
  network.shortName = shortName;
  network.l1Network.name = l1NetworkName;
};
const promptNetworkReplacement = async (network: Network) => {
  const config = getConfig();

  if (config.find((e) => e.network.key === network.key)) {
    const { sameNetworkAction }: { sameNetworkAction: "replace" | "add-as-copy" } = await prompt([
      {
        message: "Network with the same key found in the config, how do you want to proceed?",
        name: "sameNetworkAction",
        type: "select",
        choices: [
          { message: "Replace", name: "replace" },
          { message: `Add as "${network.key}-copy"`, name: "add-as-copy" },
        ],
      },
    ]);

    if (sameNetworkAction === "add-as-copy") {
      network.key = `${network.key}-copy`;
    } else if (sameNetworkAction === "replace") {
      config.splice(
        config.findIndex((e) => e.network.key === network.key),
        1
      );
      saveConfig(config);
    }
  }
};

const generateConfig = async (network: Network, tokens: Token[]) => {
  const config = getConfig();

  // Add ETH token if it's not in the list
  if (!tokens.find((token: Token) => token.address === ETH_L2_ADDRESS)) {
    tokens.unshift({
      address: ETH_L2_ADDRESS,
      l1Address: ETH_L1_ADDRESS,
      symbol: "ETH",
      decimals: 18,
      iconUrl: "/img/eth.svg",
      enabledForFees: true,
    });
  }

  config.unshift({ network, tokens });
  saveConfig(config);
};

migrateHyperchainInfo();
