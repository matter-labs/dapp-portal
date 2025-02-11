![ZKsync Portal](public/preview.png)

# ZKsync Portal 🚀

**ZKsync Portal** is a state-of-the-art dapp, merging the power of bridge, tokens manager and transaction history into one user-friendly interface. Designed with a stress on effortless user experience, it simplifies token management, making it your premier interface for interacting with both ZKsync versions - every interaction smooth and efficient.

## ✨ Features

- 🖥️ Intuitive interface for managing, sending, and bridging ZKsync Era.
- 📇 Ability to add contacts for quick and easy access.
- 🔧 Effortless setup and connection to local ZKsync nodes or ZK Stack Hyperchains.

## 🎉 Try it out!

- 🌐 Dive in now at [portal.zksync.io](https://portal.zksync.io/).

---

## 🌍 Connecting to local node

Harness the Portal's power to connect to your [local ZKsync Era node](https://docs.zksync.io/zksync-node/quickstart).

**Prerequisites:** Node.js version 16+, npm version 7+

1. 📚 Follow the [documentation](https://docs.zksync.io/zksync-node/quickstart) for setting up either an **in-memory node** or **dockerized local setup**.
2. 🔄 Clone the Portal repository and set it up:
   ```bash
   git clone https://github.com/matter-labs/dapp-portal.git
   cd dapp-portal
   npm install
   ```
3. 🛠️ Modify the default network settings in `data/networks.ts` if your network ID, RPC URL, or other info differs. Customize displayed tokens there if needed.
   - Alternatively, use the [configuration form](./hyperchains/README.md#configure-automatically-with-form) for guided config setup.
4. 🔥 Launch the dev server:
   - For in-memory node:
     ```bash
     npm run dev:node:memory
     ```
   - For dockerized setup:
     `bash
npm run dev:node:docker
`
     Navigate to the displayed Portal URL (typically http://localhost:3000).

---

## 🔗 Connecting to Hyperchain

To use Portal with your ZK Stack Hyperchain, see the guide [here](./hyperchains/README.md).

---

## 🛠 Development

### Advanced configuration

#### L1 Balances:

By default, L1 balances are fetched via a public RPC. For faster loading speeds and reduced load on your L1 RPC provider, consider using [Ankr's RPC service](https://www.ankr.com/rpc/). Obtain an Ankr token and update the `.env` file:

```bash
ANKR_TOKEN=your_ankr_token_here
```

#### Wallet Connect Project Setup:

Before deploying your own version of the Portal, ensure you create your own Wallet Connect project on [walletconnect.com](https://walletconnect.com). After creating the project, update the project ID in the `.env` file:

```bash
WALLET_CONNECT_PROJECT_ID=your_project_id_here
```

#### Error logging with [Sentry](https://sentry.io/)

In the .env file, add the Sentry variables:
```bash
SENTRY_DSN=your_sentry_dsn_url_here
SENTRY_ENV=localhost # 'localhost' | 'production'
```
SENTRY_ENV variable is used in order to filter the issues by environment. 

### 🔧 Setup

Ensure you've installed the necessary dependencies:

```bash
npm install
```

### 🌐 Development Server

Activate the dev server at http://localhost:3000:

```bash
npm run dev
```

### 🏭 Production

Compile for production:

```bash
npm run generate
```

📘 Familiarize yourself with the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) for a deeper dive.

---

## 🤝 Contributing

Open arms for contributions! Enhance our code and send your pull request [here](https://github.com/matter-labs/dapp-portal/pulls).

---

## 📜 License

Proudly under the [MIT License](https://github.com/matter-labs/dapp-portal/blob/main/LICENSE).
