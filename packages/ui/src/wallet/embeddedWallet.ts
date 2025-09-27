import { EcdsaKAccountContract, EcdsaRAccountContract } from '@aztec/accounts/ecdsa/lazy'
import { SchnorrAccountContract } from '@aztec/accounts/schnorr/lazy'
import { getInitialTestAccountsData } from '@aztec/accounts/testing/lazy'
import {
  type Account,
  type AccountContract,
  AccountManager,
  BaseWallet,
  SignerlessAccount,
  type PXE,
  createAztecNodeClient,
  type Aliased,
  type AztecNode,
  CompleteAddress,
} from '@aztec/aztec.js'
import { getPXEServiceConfig, type PXEServiceConfig } from '@aztec/pxe/config'
import { createPXEService } from '@aztec/pxe/client/lazy'
import { Fq, Fr } from '@aztec/foundation/fields'
import { AztecAddress } from '@aztec/stdlib/aztec-address'
import { deriveSigningKey } from '@aztec/stdlib/keys'
import { DefaultMultiCallEntrypoint } from '@aztec/entrypoints/multicall'
import { WalletDB, type AccountType } from './walletDB'
import { convertFromUTF8BufferAsString } from '../utils/conversion'
import { createStore } from '@aztec/kv-store/indexeddb'
import { createLogger } from '@aztec/foundation/log'
import { MINTER_ACCOUNT } from '../constants/tokens'

export interface AccountData {
  secret: Fr
  salt: Fr
  contract: AccountContract
}

export class EmbeddedWallet extends BaseWallet {
  private walletDB: WalletDB

  constructor(pxe: PXE, aztecNode: AztecNode, walletDB: WalletDB) {
    super(pxe, aztecNode)
    this.walletDB = walletDB
  }

  static async create(nodeURL: string) {
    const aztecNode = createAztecNodeClient(nodeURL)
    const l1Contracts = await aztecNode.getL1ContractAddresses()
    const rollupAddress = l1Contracts.rollupAddress

    const config = getPXEServiceConfig()
    config.dataDirectory = `pxe-${rollupAddress}`
    config.proverEnabled = true
    const configWithContracts = {
      ...config,
      l1Contracts,
      proverEnabled: false
    } as PXEServiceConfig

    const pxeLogger = createLogger('wallet:pxe')
    const pxe = await createPXEService(aztecNode, configWithContracts, {
      loggers: {
        store: pxeLogger,
        pxe: pxeLogger,
        prover: createLogger('wallet:prover'),
      },

    })

    const walletLogger = createLogger('wallet:data:idb')
    const walletDBStore = await createStore(
      `wallet-${rollupAddress}`,
      { dataDirectory: 'wallet', dataStoreMapSizeKB: 2e10 },
      walletLogger,
    )
    const db = WalletDB.init(walletDBStore, walletLogger.info)

    // add minter account
    const wallet = new EmbeddedWallet(pxe, aztecNode, db)
    wallet.createAndStoreAccount(
      "minter",
      "schnorr",
      MINTER_ACCOUNT.secret,
      MINTER_ACCOUNT.salt,
      deriveSigningKey(MINTER_ACCOUNT.secret).toBuffer(),
    )
    return wallet
  }

  protected async getAccountFromAddress(address: AztecAddress): Promise<Account> {
    let account: Account | undefined
    if (address.equals(AztecAddress.ZERO)) {
      const { l1ChainId: chainId, rollupVersion } = await this.aztecNode.getNodeInfo()
      account = new SignerlessAccount(new DefaultMultiCallEntrypoint(chainId, rollupVersion))
    } else {
      const { secretKey, salt, signingKey, type } = await this.walletDB.retrieveAccount(address)
      const parsedType = convertFromUTF8BufferAsString(type) as AccountType
      const accountManager = await this.createAccountInternal(
        parsedType,
        secretKey,
        salt,
        signingKey,
      )
      account = await accountManager.getAccount()
    }

    if (!account) {
      throw new Error(`Account not found in wallet for address: ${address}`)
    }

    return account
  }

  private async createAccountInternal(
    type: AccountType,
    secret: Fr,
    salt: Fr,
    signingKey: Buffer,
  ): Promise<AccountManager> {
    let contract: AccountContract
    switch (type) {
      case 'schnorr':
        contract = new SchnorrAccountContract(Fq.fromBuffer(signingKey))
        break
      case 'ecdsasecp256k1':
        contract = new EcdsaKAccountContract(signingKey)
        break
      case 'ecdsasecp256r1':
        contract = new EcdsaRAccountContract(signingKey)
        break
      default:
        throw new Error(`Unknown account type ${type}`)
    }

    const accountManager = await AccountManager.create(this, this.pxe, secret, contract, salt)
    await accountManager.register()

    return accountManager
  }

  async registerAccountWithPXE(
    contractSecretKey: Fr,
    partialAddress: Fr
  ): Promise<CompleteAddress> {
    return await this.pxe.registerAccount(contractSecretKey, partialAddress)
  }

  async createAndStoreAccount(
    alias: string,
    type: AccountType,
    secret: Fr,
    salt: Fr,
    signingKey: Buffer,
  ): Promise<AccountManager> {
    const accountManager = await this.createAccountInternal(type, secret, salt, signingKey)
    await this.walletDB.storeAccount(accountManager.getAddress(), {
      type,
      secretKey: secret,
      salt,
      alias,
      signingKey,
    })
    return accountManager
  }

  async getAccounts() {
    const aliasedAccounts = await this.walletDB.listAccounts()
    const testAccountData = await getInitialTestAccountsData()
    const [sampleAccount] = testAccountData
    let i = 0
    if (
      !aliasedAccounts.find((aliased) => aliased.item.equals(sampleAccount.address)) &&
      (await this.pxe.getContractMetadata(sampleAccount.address)).isContractInitialized
    ) {
      for (const accountData of testAccountData) {
        const accountManager = await this.createAccountInternal(
          'schnorr',
          accountData.secret,
          accountData.salt,
          accountData.signingKey.toBuffer(),
        )
        if (!aliasedAccounts.find(({ item }) => accountManager.getAddress().equals(item))) {
          const instance = accountManager.getInstance()
          const account = await accountManager.getAccount()
          const alias = `test${i}`
          await this.walletDB.storeAccount(instance.address, {
            type: 'schnorr',
            secretKey: account.getSecretKey(),
            alias,
            signingKey: deriveSigningKey(account.getSecretKey()).toBuffer(),
            salt: instance.salt,
          })
          aliasedAccounts.push({
            alias: `accounts:${alias}`,
            item: instance.address,
          })
        }
        i++
      }
    }
    return aliasedAccounts
  }

  override async registerSender(address: AztecAddress, alias: string) {
    await this.walletDB.storeSender(address, alias)
    return this.pxe.registerSender(address)
  }

  override async getSenders(): Promise<Aliased<AztecAddress>[]> {
    const senders = await this.pxe.getSenders()
    const storedSenders = await this.walletDB.listSenders()
    for (const storedSender of storedSenders) {
      if (senders.findIndex((sender) => sender.equals(storedSender.item)) === -1) {
        await this.pxe.registerSender(storedSender.item)
      }
    }
    return storedSenders
  }
}
