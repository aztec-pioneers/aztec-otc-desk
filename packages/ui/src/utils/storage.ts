import {
  type ContractArtifact,
  AztecAddress,
  TxReceipt,
  type AuthWitness,
  type TxHash,
  TxStatus,
  type Aliased,
} from '@aztec/aztec.js';
import type { LogFn } from '@aztec/foundation/log';
import { type AztecAsyncMap, type AztecAsyncKVStore, type AztecAsyncMultiMap } from '@aztec/kv-store';
import { stringify } from 'buffer-json';

export const Aliases = ['accounts', 'artifacts', 'secrets', 'transactions', 'authwits', 'contracts'] as const;
export type AliasType = (typeof Aliases)[number];

export class OTCEscrowDB {
  private aliases: AztecAsyncMap<string, Buffer>;
  private escrows: AztecAsyncMap<string, Buffer>;
  private transactions: AztecAsyncMap<string, Buffer>;
  private transactionsPerContract: AztecAsyncMultiMap<string, Buffer>;
  private userLog: LogFn;

  private static instance: OTCEscrowDB;

  static getInstance() {
    if (!OTCEscrowDB.instance) {
      OTCEscrowDB.instance = new OTCEscrowDB();
    }

    return OTCEscrowDB.instance;
  }

  init(store: AztecAsyncKVStore, userLog: LogFn) {
    this.aliases = store.openMap('aliases');
    this.transactions = store.openMap<string, Buffer>('transactions');
    this.transactionsPerContract = store.openMultiMap<string, Buffer>('transactionsPerContract');
    this.escrows = store.openMap<string, Buffer>('escrows');
    this.userLog = userLog;
  }

  async storeEscrow(address: AztecAddress, log: LogFn = this.userLog, alias?: string) {
    const existing = await this.aliases.getAsync(`artifacts:${address.toString()}`);
    if (existing) {
      throw new Error('Contract with this address already exists');
    }
    if (alias) {
      await this.aliases.set(`contracts:${alias}`, Buffer.from(address.toString()));
    }
    log(`Escrow contract stored in database with alias${alias ? `es last & ${alias}` : ' last'}`);
  }

  async storeAuthwitness(authWit: AuthWitness, log: LogFn = this.userLog, alias?: string) {
    if (alias) {
      await this.aliases.set(`authwits:${alias}`, Buffer.from(authWit.toString()));
    }
    log(`Authorization witness stored in database with alias${alias ? `es last & ${alias}` : ' last'}`);
  }

  async storeTx(
    {
      contractAddress,
      txHash,
      name,
      receipt,
    }: {
      contractAddress: AztecAddress;
      txHash: TxHash;
      name: string;
      receipt: TxReceipt;
    },
    log: LogFn = this.userLog,
    alias?: string,
  ) {
    if (alias) {
      await this.aliases.set(`transactions:${alias}`, Buffer.from(txHash.toString()));
    }
    await this.transactionsPerContract.set(`${contractAddress.toString()}`, Buffer.from(txHash.toString()));

    await this.transactions.set(`${txHash.toString()}:hash`, Buffer.from(txHash.toString()));
    await this.transactions.set(`${txHash.toString()}:name`, Buffer.from(name));
    await this.transactions.set(`${txHash.toString()}:status`, Buffer.from(receipt.status.toString()));
    await this.transactions.set(`${txHash.toString()}:date`, Buffer.from(Date.now().toString()));
    log(`Transaction hash stored in database with alias${alias ? `es last & ${alias}` : ' last'}`);
  }

  async updateTxStatus(txHash: TxHash, status: TxStatus) {
    await this.transactions.set(`${txHash.toString()}:status`, Buffer.from(status.toString()));
  }

  async retrieveTxsPerContract(contractAddress: AztecAddress) {
    const result = [];
    for await (const txHash of this.transactionsPerContract.getValuesAsync(contractAddress.toString())) {
      result.push(txHash.toString());
    }
    return result;
  }

  async retrieveTxData(txHash: TxHash) {
    const nameBuffer = await this.transactions.getAsync(`${txHash.toString()}:name`);
    if (!nameBuffer) {
      throw new Error(
        `Could not find ${txHash.toString()}:name. Transaction with hash "${txHash.toString()}" does not exist on this wallet.`,
      );
    }
    const name = nameBuffer.toString();
    const status = (await this.transactions.getAsync(`${txHash.toString()}:status`))!.toString();

    const date = (await this.transactions.getAsync(`${txHash.toString()}:date`))!.toString();

    return {
      txHash,
      name,
      status,
      date,
    };
  }

  tryRetrieveAlias(arg: string) {
    try {
      return this.retrieveAlias(arg);
    } catch {
      return arg;
    }
  }

  async retrieveAlias(arg: string) {
    if (Aliases.find(alias => arg.startsWith(`${alias}:`))) {
      const [type, ...alias] = arg.split(':');
      const data = await this.aliases.getAsync(`${type}:${alias.join(':') ?? 'last'}`);
      if (!data) {
        throw new Error(`Could not find alias ${arg}`);
      }
      return data.toString();
    } else {
      throw new Error(`Aliases must start with one of ${Aliases.join(', ')}`);
    }
  }

  async listAliases(type?: AliasType): Promise<Aliased<string>[]> {
    const result = [];
    if (type && !Aliases.includes(type)) {
      throw new Error(`Unknown alias type ${type}`);
    }
    for await (const [alias, item] of this.aliases.entriesAsync()) {
      if (!type || alias.startsWith(`${type}:`)) {
        result.push({ alias, item: item.toString() });
      }
    }
    return result;
  }

  async storeAlias(type: AliasType, alias: string, value: Buffer, log: LogFn = this.userLog) {
    await this.aliases.set(`${type}:${alias}`, value);
    log(`Data stored in database with alias ${type}:${alias}`);
  }
}