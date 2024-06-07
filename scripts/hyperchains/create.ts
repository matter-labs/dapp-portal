import { prompt } from "enquirer";
import slugify from "slugify";
import { mainnet, Chain } from "viem/chains";

import { PUBLIC_L1_CHAINS, type Network } from "./common";
import { generateNetworkConfig, logUserInfo, promptNetworkReplacement } from "./utils";

const promptHyperchainInfo = async (): Promise<Network> => {
  const { id, name }: { id: number; name: string } = await prompt([
    {
      message: "Hyperchain chain id",
      name: "id",
      type: "numeral",
      required: true,
      float: false,
    },
    {
      message: "Displayed hyperchain name",
      name: "name",
      type: "input",
      required: true,
    },
  ]);
  const {
    key,
    rpcUrl,
    blockExplorerUrl,
    blockExplorerApi,
    connectedToL1,
  }: { key: string; rpcUrl: string; blockExplorerUrl: string; blockExplorerApi: string; connectedToL1: boolean } =
    await prompt([
      {
        message: "Hyperchain key",
        name: "key",
        type: "input",
        required: true,
        initial: slugify(name, {
          lower: true,
          replacement: "-",
          strict: true,
        }),
      },
      {
        message: "Hyperchain RPC URL",
        name: "rpcUrl",
        type: "input",
        required: true,
      },
      {
        message: "Hyperchain Block Explorer URL (optional)",
        name: "blockExplorerUrl",
        type: "input",
      },
      {
        message: "Hyperchain Block Explorer API (optional)",
        name: "blockExplorerApi",
        type: "input",
      },
      {
        message: "Is hyperchain connected to L1 network?",
        name: "connectedToL1",
        type: "confirm",
        required: true,
        initial: true,
      },
    ]);

  let l1Network: Network["l1Network"] | undefined;
  let publicL1NetworkId: number | undefined;

  if (connectedToL1) {
    // Ask select from public L1 chains (should list all options) or `+ Add custom L1 chain`
    const { selectedOption }: { selectedOption: "add-custom-chain" | Chain } = await prompt({
      message: "Select L1 chain",
      name: "selectedOption",
      type: "select",
      required: true,
      choices: [
        ...PUBLIC_L1_CHAINS.map((chain) => ({
          name: `${chain.id === mainnet.id ? "Ethereum Mainnet" : "Ethereum " + chain.name}${
            chain.testnet ? " Testnet" : ""
          }`,
          value: chain,
        })),
        { name: "+ Add custom L1 chain", value: "add-custom-chain" },
      ],
      result(resultName) {
        return this.choices.find((choice: { name: string }) => choice.name === resultName).value;
      },
    });
    if (selectedOption === "add-custom-chain") {
      const {
        l1NetworkId,
        l1NetworkName,
        l1NetworkRpcUrl,
        l1NetworkBlockExplorerUrl,
      }: {
        l1NetworkId: number;
        l1NetworkName: string;
        l1NetworkRpcUrl: string;
        l1NetworkBlockExplorerUrl: string;
      } = await prompt([
        {
          message: "L1 chain id",
          name: "l1NetworkId",
          type: "numeral",
          required: true,
          float: false,
        },
        {
          message: "Displayed L1 chain name",
          name: "l1NetworkName",
          type: "input",
          required: true,
        },
        {
          message: "L1 chain RPC URL",
          name: "l1NetworkRpcUrl",
          type: "input",
          required: true,
        },
        {
          message: "L1 chain Block Explorer URL (optional)",
          name: "l1NetworkBlockExplorerUrl",
          type: "input",
        },
      ]);

      l1Network = {
        id: l1NetworkId,
        name: l1NetworkName,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
          default: { http: [l1NetworkRpcUrl] },
          public: { http: [l1NetworkRpcUrl] },
        },
        blockExplorers: l1NetworkBlockExplorerUrl
          ? {
              default: {
                name: l1NetworkName,
                url: l1NetworkBlockExplorerUrl,
              },
            }
          : undefined,
      };
    } else {
      publicL1NetworkId = selectedOption.id;
    }
  }

  return {
    id,
    name,
    key,
    rpcUrl,
    blockExplorerUrl,
    blockExplorerApi,
    l1Network,
    publicL1NetworkId,
  };
};

(async () => {
  const network = await promptHyperchainInfo();
  await promptNetworkReplacement(network);
  generateNetworkConfig(network, []);
  logUserInfo();
})();
