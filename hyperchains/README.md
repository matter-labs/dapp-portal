# 🚀 Hyperchain Portal Setup

Portal supports custom ZK Stack Hyperchain nodes.

---

## ⚙️ Configuration

There are a few different ways to configure the application:

### 🖊️ Configure automatically with form
<details>
<summary>Fill out a simple form to configure the application.</summary>

1. Make sure to install the dependencies:
    ```bash
    npm install
    ```
2. 🌟 Follow the instructions in the terminal:
    ```bash
    npm run hyperchain:create
    ```
    This will regenerate `/hyperchains/config.json` file. You can edit this file manually if needed.
3. 🚀 Now you can start or build the application. See [Development](#development-server) or [Production](#production) section below for more details.
</details>

### ✏️ Configure manually
<details>
<summary>Manually configure the application by editing the config file.</summary>

1. 🔗 Add your network information to `/hyperchains/config.json` config file. See example config file in `/hyperchains/example.config.json`
2. 🚀 Now you can start or build the application. See [Development](#development) or [Production](#production) section below for more details.
</details>

<details>

<summary><b>Hyperchain config.json structure</b></summary>

```ts
Array<{
  network: {
    key: string;
    id: number; // L2 Network ID
    rpcUrl: string; // L2 RPC URL
    name: string;
    blockExplorerUrl?: string; // L2 Block Explorer URL
    blockExplorerApi?: string; // L2 Block Explorer API
    hidden?: boolean; // Hidden in the network selector
    publicL1NetworkId?: number; // If you wish to use Ethereum Mainnet or Ethereum Sepolia Testnet with default configuration. Can be provided instead of `l1Network`
    l1Network?: { // @wagmi `Chain` structure https://wagmi.sh/core/chains#build-your-own
      // minimal required fields shown
      id: number;
      name: string;
      network: string;
      nativeCurrency: { name: string; symbol: string; decimals: number };
      rpcUrls: {
        default: { http: [ string ] },
        public: { http: [ string ] }
      }
    };
  },
  tokens: Array<{ // Should at least contain the `ETH` token (see `/hyperchains/example.config.json` for example)
    address: string;
    l1Address?: string;
    name?: string;
    symbol: string;
    decimals: number;
    iconUrl?: string;
    price?: number;
  }>
}>
```
</details>

---

## 🛠 Development

### Advanced configuration
Read more in the main README: [Advanced configuration](../README.md#advanced-configuration)

### 🔧 Setup

Make sure to install the dependencies:

```bash
npm install
```

### 🌐 Development Server

Start the development server on http://localhost:3000

```bash
npm run dev:node:hyperchain
```

### 🏭 Production

Build the application for production:

```bash
npm run generate:node:hyperchain
```
