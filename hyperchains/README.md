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
    blockExplorerApi?: string; // L2 Block Explorer API (optional - fallback to RPC if not available)
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
    settlementChains?: Array<{ // Settlement layers for withdrawal tracking
      explorerUrl: string;
      name: string;
      chainId: number;
    }>;
    displaySettings?: {
      isTestnet?: boolean;
      onramp?: boolean;
      showPartnerLinks?: boolean;
    };
  },
  tokens: Array<{ // Should at least contain the `ETH` token (see `/hyperchains/example.config.json` for example)
    address: string;
    l1Address?: string; // Required for withdrawals - maps L2 token to L1 equivalent
    name?: string;
    symbol: string;
    decimals: number;
    iconUrl?: string;
    price?: number;
  }>
}>
```
</details>

### 📋 Configuration Best Practices

<details>
<summary><b>Essential configuration guidelines for reliable Portal operation</b></summary>

#### **L1 Network Configuration**
- **Required for balance fetching**: Portal needs `l1Network` to fetch L1 balances for deposits
- **RPC endpoints**: Provide reliable RPC URLs in `rpcUrls.default.http` array
- **Chain ID**: Must match your actual L1 network (e.g., `1` for mainnet, `11155111` for sepolia, `9` for localhost)

#### **Settlement Chains Configuration**  
- **Multi-chain withdrawals**: Use `settlementChains` to track withdrawals across multiple settlement layers
- **Chain mapping**: Each `chainId` should correspond to a network where withdrawal transactions can be verified
- **Dynamic routing**: Portal automatically routes settlement verification based on your configuration

#### **Token Configuration**
- **L1 mapping required**: Set `l1Address` for all tokens that support withdrawals
- **ETH token**: Use `"0x0000000000000000000000000000000000000000"` as `l1Address` for ETH
- **Custom tokens**: Map your L2 token address to the corresponding L1 contract address

#### **Block Explorer API (Optional)**
- **Fallback behavior**: If `blockExplorerApi` is unreliable, Portal automatically falls back to RPC-based fetching
- **Performance**: Working block explorer APIs provide faster token and balance loading
- **Not required**: Portal works fully without block explorer APIs using direct RPC calls

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
