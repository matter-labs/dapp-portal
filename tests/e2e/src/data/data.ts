export enum Extension {
  specifiedExtensionUrl = "chrome-extension://",
  allExtensionsUrl = "chrome://extensions/",
  metamaskHomeHtml = "/home.html",
  metamaskInitialize = "#initialize/welcome",
  metamaskAdvSettings = "#settings/advanced",
  metamaskNetworkSettings = "#settings/networks",
}

export enum UrlParamNetworks {
  networkEraSepolia = "network=sepolia",
  networkEraMainnet = "network=era-mainnet",
}

export enum NetworkSwitcher {
  zkSyncEraSepolia = `/?${UrlParamNetworks.networkEraSepolia}`,
  zkSyncEraMainnet = `/?${UrlParamNetworks.networkEraMainnet}`,
}

export enum Routes {
  withdraw = "/transaction/zksync/era/withdraw",
  deposit = "/transaction/zksync/era/deposit",
  txBlockExplorer = "https://goerli.explorer.zksync.io/tx",
}
