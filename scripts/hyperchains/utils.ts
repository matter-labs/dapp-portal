/* eslint-disable no-console */
import { prompt } from "enquirer";
import { readFileSync, writeFileSync } from "fs";
import { join as pathJoin } from "path";

import type { Network, Config } from "./common";
import type { Token } from "../../types";

export const configPath = pathJoin(__dirname, "../../hyperchains/config.json");
const getConfig = (): Config => {
  return JSON.parse(readFileSync(configPath).toString());
};
const saveConfig = (config: Config) => {
  return writeFileSync(configPath, JSON.stringify(config, null, 2));
};

export const promptNetworkReplacement = async (network: Network) => {
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

export const generateNetworkConfig = (network: Network, tokens: Token[]) => {
  const config = getConfig();

  /* // Add ETH token if it's not in the list
  if (!tokens.some((token: Token) => token.address === ETH_TOKEN.address)) {
    tokens.unshift(ETH_TOKEN);
  } */

  config.unshift({ network, tokens });
  saveConfig(config);
};

export const logUserInfo = () => {
  console.log("\nConfig has been generated successfully!");
  console.log("You can find more info in /hyperchains/README.md\n");

  console.log("You can start Portal with your new config by running");
  console.log("npm run dev:node:hyperchain");
};
