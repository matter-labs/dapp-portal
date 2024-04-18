import { poll } from "@ethersproject/web";
import { BigNumber, Contract, ethers, providers, utils } from "ethers";
import { AbiCoder } from "ethers/lib/utils";

import { Signer } from "./signer";
import { TransactionStatus } from "./types";
import {
  CONTRACT_DEPLOYER,
  CONTRACT_DEPLOYER_ADDRESS,
  EIP712_TX_TYPE,
  ETH_ADDRESS,
  getL2HashFromPriorityOp,
  isETH,
  L2_ETH_TOKEN_ADDRESS,
  parseTransaction,
  PRIMARY_CHAIN_KEY,
  REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT,
  sleep,
} from "./utils";
import { IERC20MetadataFactory, IEthTokenFactory, IL2BridgeFactory } from "../typechain";

// eslint-disable-next-line import/order
import type { ExternalProvider } from "@ethersproject/providers";

import Formatter = providers.Formatter;

import type {
  Address,
  BalancesMap,
  Block,
  BlockDetails,
  BlockTag,
  BlockWithTransactions,
  ContractAccountInfo,
  EventFilter,
  Log,
  MessageProof,
  PriorityOpResponse,
  Token,
  TransactionDetails,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "./types";
import type { ConnectionInfo } from "@ethersproject/web";
import type { BigNumberish, BytesLike } from "ethers";
let defaultFormatter: Formatter = null;
export type ContractAddresses = {
  mainContract?: Address;
  erc20BridgeL1?: Address;
  erc20BridgeL2?: Address;
  l1Gateway?: Address;
  wethContract?: Address[];
};
export class Provider extends ethers.providers.JsonRpcProvider {
  protected contractAddressesMap: Map<string, ContractAddresses>;

  protected networkKey: string;
  protected _isEthGasToken: boolean;

  override async getTransactionReceipt(transactionHash: string | Promise<string>): Promise<TransactionReceipt> {
    await this.getNetwork();

    transactionHash = await transactionHash;

    const params = { transactionHash: this.formatter.hash(transactionHash, true) };

    return poll(
      async () => {
        const result = await this.perform("getTransactionReceipt", params);

        if (result == null) {
          if (this._emitted["t:" + transactionHash] == null) {
            return null;
          }
          return undefined;
        }

        if (result.blockNumber == null && result.status != null && BigNumber.from(result.status).isZero()) {
          // transaction is rejected in the state-keeper
          return {
            ...this.formatter.receipt({
              ...result,
              confirmations: 1,
              blockNumber: 0,
              blockHash: ethers.constants.HashZero,
            }),
            blockNumber: null,
            blockHash: null,
            l1BatchNumber: null,
            l1BatchTxIndex: null,
          };
        }

        if (result.blockHash == null) {
          // receipt is not ready
          return undefined;
        } else {
          const receipt = this.formatter.receipt(result);
          if (receipt.blockNumber == null) {
            receipt.confirmations = 0;
          } else if (receipt.confirmations == null) {
            const blockNumber = await this._getInternalBlockNumber(100 + 2 * this.pollingInterval);

            // Add the confirmations using the fast block number (pessimistic)
            let confirmations = blockNumber - receipt.blockNumber + 1;
            if (confirmations <= 0) {
              confirmations = 1;
            }
            receipt.confirmations = confirmations;
          }
          return receipt;
        }
      },
      { oncePoll: this }
    );
  }

  override async getBlock(blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>): Promise<Block> {
    return <Promise<Block>>this._getBlock(blockHashOrBlockTag, false);
  }

  override async getBlockWithTransactions(
    blockHashOrBlockTag: BlockTag | string | Promise<BlockTag | string>
  ): Promise<BlockWithTransactions> {
    return <Promise<BlockWithTransactions>>this._getBlock(blockHashOrBlockTag, true);
  }

  static override getFormatter(): Formatter {
    if (defaultFormatter == null) {
      defaultFormatter = new Formatter();
      const number = defaultFormatter.number.bind(defaultFormatter);
      const boolean = defaultFormatter.boolean.bind(defaultFormatter);
      const hash = defaultFormatter.hash.bind(defaultFormatter);
      const address = defaultFormatter.address.bind(defaultFormatter);

      defaultFormatter.formats.receiptLog.l1BatchNumber = Formatter.allowNull(number);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (defaultFormatter.formats as any).l2Tol1Log = {
        blockNumber: number,
        blockHash: hash,
        l1BatchNumber: Formatter.allowNull(number),
        transactionIndex: number,
        shardId: number,
        isService: boolean,
        sender: address,
        key: hash,
        value: hash,
        transactionHash: hash,
        logIndex: number,
      };

      defaultFormatter.formats.receipt.l1BatchNumber = Formatter.allowNull(number);
      defaultFormatter.formats.receipt.l1BatchTxIndex = Formatter.allowNull(number);
      defaultFormatter.formats.receipt.l2ToL1Logs = Formatter.arrayOf((value) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Formatter.check((defaultFormatter.formats as any).l2Tol1Log, value)
      );

      defaultFormatter.formats.block.l1BatchNumber = Formatter.allowNull(number);
      defaultFormatter.formats.block.l1BatchTimestamp = Formatter.allowNull(number);
      defaultFormatter.formats.blockWithTransactions.l1BatchNumber = Formatter.allowNull(number);
      defaultFormatter.formats.blockWithTransactions.l1BatchTimestamp = Formatter.allowNull(number);
      defaultFormatter.formats.transaction.l1BatchNumber = Formatter.allowNull(number);
      defaultFormatter.formats.transaction.l1BatchTxIndex = Formatter.allowNull(number);

      defaultFormatter.formats.filterLog.l1BatchNumber = Formatter.allowNull(number);
    }
    return defaultFormatter;
  }

  override async getBalance(address: Address, blockTag?: BlockTag, tokenAddress?: Address) {
    const tag = this.formatter.blockTag(blockTag);
    if (tokenAddress == null || isETH(tokenAddress)) {
      // requesting ETH balance
      return await super.getBalance(address, tag);
    } else {
      try {
        const token = IERC20MetadataFactory.connect(tokenAddress, this);
        return await token.balanceOf(address, { blockTag: tag });
      } catch {
        return BigNumber.from(0);
      }
    }
  }

  async l2TokenAddress(token: Address) {
    if (token == ETH_ADDRESS) {
      return ETH_ADDRESS;
    } else {
      const erc20BridgeAddress = (await this.getDefaultBridgeAddresses()).erc20L2;
      const erc20Bridge = IL2BridgeFactory.connect(erc20BridgeAddress!, this);
      return await erc20Bridge.l2TokenAddress(token);
    }
  }

  async l1TokenAddress(token: Address) {
    if (token == ETH_ADDRESS) {
      return ETH_ADDRESS;
    } else {
      const erc20BridgeAddress = (await this.getDefaultBridgeAddresses()).erc20L2;
      const erc20Bridge = IL2BridgeFactory.connect(erc20BridgeAddress!, this);
      return await erc20Bridge.l1TokenAddress(token);
    }
  }

  // This function is used when formatting requests for
  // eth_call and eth_estimateGas. We override it here
  // because we have extra stuff to serialize (customData).
  // This function is for internal use only.
  static override hexlifyTransaction(
    transaction: ethers.providers.TransactionRequest,
    allowExtra?: Record<string, boolean>
  ) {
    const result = ethers.providers.JsonRpcProvider.hexlifyTransaction(transaction, {
      ...allowExtra,
      customData: true,
      from: true,
    });
    if (transaction.customData == null) {
      return result;
    }
    result.eip712Meta = {
      gasPerPubdata: utils.hexValue(transaction.customData.gasPerPubdata ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    transaction.type = EIP712_TX_TYPE;
    if (transaction.customData.factoryDeps) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      result.eip712Meta.factoryDeps = transaction.customData.factoryDeps.map((dep: ethers.BytesLike) =>
        // TODO (SMA-1605): we arraify instead of hexlifying because server expects Vec<u8>.
        //  We should change deserialization there.
        Array.from(utils.arrayify(dep))
      );
    }
    if (transaction.customData.paymasterParams) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      result.eip712Meta.paymasterParams = {
        paymaster: utils.hexlify(transaction.customData.paymasterParams.paymaster),
        paymasterInput: Array.from(utils.arrayify(transaction.customData.paymasterParams.paymasterInput)),
      };
    }
    return result;
  }

  override async estimateGas(transaction: utils.Deferrable<TransactionRequest>): Promise<BigNumber> {
    await this.getNetwork();
    const params = await utils.resolveProperties({
      transaction: this._getTransactionRequest(transaction),
    });
    if (transaction.customData != null) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      params.transaction.customData = transaction.customData;
    }
    const result = await this.perform("estimateGas", params);
    try {
      return BigNumber.from(result);
    } catch (error) {
      throw new Error(`bad result from backend (estimateGas): ${result}`);
    }
  }

  async estimateGasL1(transaction: utils.Deferrable<TransactionRequest>): Promise<BigNumber> {
    await this.getNetwork();
    const params = await utils.resolveProperties({
      transaction: this._getTransactionRequest(transaction),
    });
    if (transaction.customData != null) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      params.transaction.customData = transaction.customData;
    }
    const result = await this.send("zks_estimateGasL1ToL2", [
      Provider.hexlifyTransaction(params.transaction, { from: true }),
    ]);
    try {
      return BigNumber.from(result);
    } catch (error) {
      throw new Error(`bad result from backend (zks_estimateGasL1ToL2): ${result}`);
    }
  }

  override async getGasPrice(token?: Address): Promise<BigNumber> {
    const params = token ? [token] : [];
    const price = await this.send("eth_gasPrice", params);
    return BigNumber.from(price);
  }

  constructor(url?: ConnectionInfo | string, network?: ethers.providers.Networkish, networkKey?: string) {
    super(url, network);
    this.pollingInterval = 500;

    const blockTag = this.formatter.blockTag.bind(this.formatter);
    this.formatter.blockTag = (tag) => {
      if (tag == "committed" || tag == "finalized") {
        return tag;
      }
      return blockTag(tag);
    };
    // this.contractAddresses = {};
    this.contractAddressesMap = new Map<string, ContractAddresses>();
    networkKey = networkKey || PRIMARY_CHAIN_KEY;
    this.networkKey = networkKey;
    this._isEthGasToken = true;
    this.contractAddressesMap.set(networkKey, {});
    this.formatter.transaction = parseTransaction;
  }

  isPrimaryChain(): boolean {
    return this.networkKey === PRIMARY_CHAIN_KEY;
  }
  isEthereumChain(): boolean {
    return this.networkKey === "ethereum";
  }
  isMantleChain(): boolean {
    return this.networkKey === "mantle";
  }
  isMantaChain(): boolean {
    return this.networkKey === "manta";
  }
  isBlastChain(): boolean {
    return this.networkKey === "blast";
  }
  isLineaChain(): boolean {
    return this.isPrimaryChain();
  }
  isZkSyncChain(): boolean {
    return this.networkKey === "zksync";
  }
  isArbitrumChain(): boolean {
    return this.networkKey === "arbitrum";
  }
  isEthGasToken(): boolean {
    return this._isEthGasToken;
  }
  getL1Gateway(): Address | undefined {
    return this.contractAddressesMap.get(this.networkKey)?.l1Gateway;
  }
  setNetworkKey(networkKey: string) {
    this.networkKey = networkKey;
    if (!this.contractAddressesMap.get(networkKey)) {
      this.contractAddressesMap.set(networkKey, {});
    }
  }
  setIsEthGasToken(isEthGasToken: boolean) {
    this._isEthGasToken = isEthGasToken;
  }

  setContractAddresses(networkKey: string, contractAddresses: ContractAddresses) {
    this.networkKey = networkKey;
    this.contractAddressesMap.set(networkKey, contractAddresses);
  }

  async getMessageProof(
    blockNumber: ethers.BigNumberish,
    sender: Address,
    messageHash: BytesLike,
    logIndex?: number
  ): Promise<MessageProof | null> {
    return await this.send("zks_getL2ToL1MsgProof", [
      BigNumber.from(blockNumber).toNumber(),
      sender,
      ethers.utils.hexlify(messageHash),
      logIndex,
    ]);
  }

  async getLogProof(txHash: BytesLike, index?: number): Promise<MessageProof | null> {
    return await this.send("zks_getL2ToL1LogProof", [ethers.utils.hexlify(txHash), index]);
  }

  async getL1BatchBlockRange(l1BatchNumber: number): Promise<[number, number] | null> {
    const range = await this.send("zks_getL1BatchBlockRange", [l1BatchNumber]);
    if (range == null) {
      return null;
    }
    return [parseInt(range[0], 16), parseInt(range[1], 16)];
  }

  async getMainContractAddress(): Promise<Address> {
    const contractAddresses = this.contractAddressesMap.get(this.networkKey);
    if (!contractAddresses) {
      throw new Error("networkKey: " + this.networkKey + " is undefined");
    }
    // if (!contractAddresses.mainContract) {
    // contractAddresses.mainContract = await this.send("zks_getMainContract", []);
    // }
    return contractAddresses.mainContract!;
  }

  async getWETHContractAddress(): Promise<Address[]> {
    const contractAddresses = this.contractAddressesMap.get(this.networkKey);
    if (!contractAddresses) {
      throw new Error("networkKey: " + this.networkKey + " is undefined");
    }
    // if (!contractAddresses.mainContract) {
    // contractAddresses.mainContract = await this.send("zks_getMainContract", []);
    // }
    return contractAddresses.wethContract!;
  }

  async getTestnetPaymasterAddress(): Promise<Address | null> {
    // Unlike contract's addresses, the testnet paymaster is not cached, since it can be trivially changed
    // on the fly by the server and should not be relied to be constant
    return await this.send("zks_getTestnetPaymaster", []);
  }

  async getDefaultBridgeAddresses() {
    const contractAddresses = this.contractAddressesMap.get(this.networkKey);
    if (!contractAddresses) {
      throw new Error("networkKey: " + this.networkKey + " is undefined");
    }

    return {
      erc20L1: contractAddresses.erc20BridgeL1,
      erc20L2: contractAddresses.erc20BridgeL2,
    };
  }

  async getConfirmedTokens(start = 0, limit = 255): Promise<Token[]> {
    const tokens: Token[] = await this.send("zks_getConfirmedTokens", [start, limit]);
    return tokens.map((token) => ({ address: token.l2Address, ...token }));
  }

  async getTokenPrice(token: Address): Promise<string | null> {
    return await this.send("zks_getTokenPrice", [token]);
  }

  async getAllAccountBalances(address: Address): Promise<BalancesMap> {
    const balances = await this.send("zks_getAllAccountBalances", [address]);
    for (const token in balances) {
      balances[token] = BigNumber.from(balances[token]);
    }
    return balances;
  }

  async l1ChainId(): Promise<number> {
    const res = await this.send("zks_L1ChainId", []);
    return BigNumber.from(res).toNumber();
  }

  async getL1BatchNumber(): Promise<number> {
    const number = await this.send("zks_L1BatchNumber", []);
    return BigNumber.from(number).toNumber();
  }

  async getBlockDetails(number: number): Promise<BlockDetails> {
    return await this.send("zks_getBlockDetails", [number]);
  }

  async getTransactionDetails(txHash: BytesLike): Promise<TransactionDetails> {
    return await this.send("zks_getTransactionDetails", [txHash]);
  }

  async getWithdrawTx(transaction: {
    token: Address;
    amount: BigNumberish;
    isMergeToken?: boolean;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    overrides?: ethers.CallOverrides;
  }): Promise<ethers.providers.TransactionRequest> {
    const { ...tx } = transaction;

    if (tx.to == null && tx.from == null) {
      throw new Error("withdrawal target address is undefined");
    }

    tx.to ??= tx.from;
    tx.overrides ??= {};
    tx.overrides.from ??= tx.from;

    if (isETH(tx.token)) {
      if (!tx.overrides.value) {
        tx.overrides.value = tx.amount;
      }
      const passedValue = BigNumber.from(tx.overrides.value);

      if (!passedValue.eq(tx.amount)) {
        // To avoid users shooting themselves into the foot, we will always use the amount to withdraw
        // as the value

        throw new Error("The tx.value is not equal to the value withdrawn");
      }

      const ethL2Token = IEthTokenFactory.connect(L2_ETH_TOKEN_ADDRESS, this);
      if (this.isPrimaryChain()) {
        return ethL2Token.populateTransaction.withdraw(tx.to!, tx.overrides);
      }
      //if secondary
      const l1Gateway = this.getL1Gateway();
      if (!l1Gateway) {
        throw new Error("l1Gateway is undefined, current network key is : " + this.networkKey);
      }
      return ethL2Token.populateTransaction.withdrawWithMessage(
        l1Gateway,
        new AbiCoder().encode(["address"], [tx.to!]),
        tx.overrides
      );
    }

    if (tx.bridgeAddress == null) {
      const bridges = await this.getDefaultBridgeAddresses();
      tx.bridgeAddress = bridges.erc20L2;
    }

    const bridge = IL2BridgeFactory.connect(tx.bridgeAddress!, this);
    return transaction.isMergeToken
      ? bridge.populateTransaction.withdrawFromMerge(tx.to!, tx.token, tx.amount, tx.overrides)
      : bridge.populateTransaction.withdraw(tx.to!, tx.token, tx.amount, tx.overrides);
  }

  async estimateGasWithdraw(transaction: {
    token: Address;
    amount: BigNumberish;
    isMergeToken?: boolean;
    from?: Address;
    to?: Address;
    bridgeAddress?: Address;
    overrides?: ethers.CallOverrides;
  }): Promise<BigNumber> {
    const withdrawTx = await this.getWithdrawTx(transaction);
    return await this.estimateGas(withdrawTx);
  }

  async getTransferTx(transaction: {
    to: Address;
    amount: BigNumberish;
    from?: Address;
    token?: Address;
    overrides?: ethers.CallOverrides;
  }): Promise<ethers.providers.TransactionRequest> {
    const { ...tx } = transaction;
    tx.overrides ??= {};
    tx.overrides.from ??= tx.from;

    if (tx.token == null || tx.token == ETH_ADDRESS) {
      return {
        ...(await ethers.utils.resolveProperties(tx.overrides)),
        to: tx.to,
        value: tx.amount,
      };
    } else {
      const token = IERC20MetadataFactory.connect(tx.token, this);
      return await token.populateTransaction.transfer(tx.to, tx.amount, tx.overrides);
    }
  }

  async estimateGasTransfer(transaction: {
    to: Address;
    amount: BigNumberish;
    from?: Address;
    token?: Address;
    overrides?: ethers.CallOverrides;
  }): Promise<BigNumber> {
    const transferTx = await this.getTransferTx(transaction);
    return await this.estimateGas(transferTx);
  }

  static getDefaultProvider() {
    // TODO (SMA-1606): Add different urls for different networks.
    return new Provider(process.env.ZKSYNC_WEB3_API_URL || "http://localhost:3050");
  }

  async newFilter(filter: EventFilter | Promise<EventFilter>): Promise<BigNumber> {
    filter = await filter;
    const id = await this.send("eth_newFilter", [this._prepareFilter(filter)]);
    return BigNumber.from(id);
  }

  async newBlockFilter(): Promise<BigNumber> {
    const id = await this.send("eth_newBlockFilter", []);
    return BigNumber.from(id);
  }

  async newPendingTransactionsFilter(): Promise<BigNumber> {
    const id = await this.send("eth_newPendingTransactionFilter", []);
    return BigNumber.from(id);
  }

  async getFilterChanges(idx: BigNumber): Promise<Array<Log | string>> {
    const logs = await this.send("eth_getFilterChanges", [idx.toHexString()]);
    return typeof logs[0] === "string" ? logs : this._parseLogs(logs);
  }

  override async getLogs(filter: EventFilter | Promise<EventFilter> = {}): Promise<Array<Log>> {
    filter = await filter;
    const logs = await this.send("eth_getLogs", [this._prepareFilter(filter)]);
    return this._parseLogs(logs);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected _parseLogs(logs: any[]): Array<Log> {
    return Formatter.arrayOf(this.formatter.filterLog.bind(this.formatter))(logs);
  }

  protected _prepareFilter(filter: EventFilter) {
    return {
      ...filter,
      fromBlock: filter.fromBlock == null ? null : this.formatter.blockTag(filter.fromBlock),
      toBlock: filter.fromBlock == null ? null : this.formatter.blockTag(filter.toBlock),
    };
  }

  override _wrapTransaction(tx: ethers.Transaction, hash?: string): TransactionResponse {
    const response = super._wrapTransaction(tx, hash) as TransactionResponse;

    response.waitFinalize = async () => {
      const receipt = await response.wait();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const block = await this.getBlock("finalized");
        if (receipt.blockNumber <= block.number) {
          return await this.getTransactionReceipt(receipt.transactionHash);
        } else {
          await sleep(this.pollingInterval);
        }
      }
    };

    return response;
  }

  // This is inefficient. Status should probably be indicated in the transaction receipt.
  async getTransactionStatus(txHash: string) {
    const tx = await this.getTransaction(txHash);
    if (tx == null) {
      return TransactionStatus.NotFound;
    }
    if (tx.blockNumber == null) {
      return TransactionStatus.Processing;
    }
    const verifiedBlock = await this.getBlock("finalized");
    if (tx.blockNumber <= verifiedBlock.number) {
      return TransactionStatus.Finalized;
    }
    return TransactionStatus.Committed;
  }

  override async getTransaction(hash: string | Promise<string>): Promise<TransactionResponse> {
    hash = await hash;
    const tx = await super.getTransaction(hash);
    return tx ? this._wrapTransaction(tx, hash) : null;
  }

  override async sendTransaction(transaction: string | Promise<string>): Promise<TransactionResponse> {
    return (await super.sendTransaction(transaction)) as TransactionResponse;
  }

  async getL2TransactionFromPriorityOp(
    l1TxResponse: ethers.providers.TransactionResponse
  ): Promise<TransactionResponse> {
    const receipt = await l1TxResponse.wait();
    const l2Hash = getL2HashFromPriorityOp(receipt, await this.getMainContractAddress());

    let status = null;
    do {
      status = await this.getTransactionStatus(l2Hash);
      await sleep(this.pollingInterval);
    } while (status == TransactionStatus.NotFound);

    return await this.getTransaction(l2Hash);
  }

  async getPriorityOpResponse(l1TxResponse: ethers.providers.TransactionResponse): Promise<PriorityOpResponse> {
    const l2Response = { ...l1TxResponse } as PriorityOpResponse;

    l2Response.waitL1Commit = l2Response.wait;
    l2Response.wait = async () => {
      const l2Tx = await this.getL2TransactionFromPriorityOp(l1TxResponse);
      return await l2Tx.wait();
    };
    l2Response.waitFinalize = async () => {
      const l2Tx = await this.getL2TransactionFromPriorityOp(l1TxResponse);
      return await l2Tx.waitFinalize();
    };

    return l2Response;
  }

  async getContractAccountInfo(address: Address): Promise<ContractAccountInfo> {
    const deployerContract = new Contract(CONTRACT_DEPLOYER_ADDRESS, CONTRACT_DEPLOYER, this);
    const data = await deployerContract.getAccountInfo(address);

    return {
      supportedAAVersion: data.supportedAAVersion,
      nonceOrdering: data.nonceOrdering,
    };
  }

  // TODO (EVM-3): support refundRecipient for fee estimation
  async estimateL1ToL2Execute(transaction: {
    contractAddress: Address;
    calldata: BytesLike;
    caller?: Address;
    l2Value?: BigNumberish;
    factoryDeps?: ethers.BytesLike[];
    gasPerPubdataByte?: BigNumberish;
    overrides?: ethers.PayableOverrides;
  }): Promise<BigNumber> {
    transaction.gasPerPubdataByte ??= REQUIRED_L1_TO_L2_GAS_PER_PUBDATA_LIMIT;

    // If the `from` address is not provided, we use a random address, because
    // due to storage slot aggregation, the gas estimation will depend on the address
    // and so estimation for the zero address may be smaller than for the sender.
    transaction.caller ??= ethers.Wallet.createRandom().address;

    const customData = {
      gasPerPubdataByte: transaction.gasPerPubdataByte,
    };
    if (transaction.factoryDeps) {
      Object.assign(customData, { factoryDeps: transaction.factoryDeps });
    }

    const fee = await this.estimateGasL1({
      from: transaction.caller,
      data: transaction.calldata,
      to: transaction.contractAddress,
      value: transaction.l2Value,
      customData,
    });

    return fee;
  }
}

export class Web3Provider extends Provider {
  readonly provider: ExternalProvider;

  constructor(
    provider: ExternalProvider,
    network?: ethers.providers.Networkish,
    networkKey?: string,
    contractAddresses?: ContractAddresses
  ) {
    if (provider == null) {
      throw new Error("missing provider");
    }
    if (!provider.request) {
      throw new Error("provider must implement eip-1193");
    }

    const path = provider.host || provider.path || (provider.isMetaMask ? "metamask" : "eip-1193:");
    super(path, network, networkKey);
    super.setContractAddresses(networkKey!, contractAddresses!);
    this.provider = provider;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override async send(method: string, params?: Array<any>): Promise<any> {
    params ??= [];
    // Metamask complains about eth_sign (and on some versions hangs)
    if (method == "eth_sign" && (this.provider.isMetaMask || this.provider.isStatus)) {
      // https://github.com/ethereum/go-ethereum/wiki/Management-APIs#personal_sign
      method = "personal_sign";
      params = [params[1], params[0]];
    }
    return await this.provider.request({ method, params });
  }

  override getSigner(addressOrIndex?: number | string): Signer {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Signer.from(super.getSigner(addressOrIndex) as any);
  }

  override async estimateGas(transaction: ethers.utils.Deferrable<TransactionRequest>) {
    const gas: BigNumber = await super.estimateGas(transaction);
    const metamaskMinimum = BigNumber.from(21000);
    const isEIP712 = transaction.customData != null || transaction.type == EIP712_TX_TYPE;
    return gas.gt(metamaskMinimum) || isEIP712 ? gas : metamaskMinimum;
  }
}
