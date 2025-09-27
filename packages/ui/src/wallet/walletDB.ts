import { AztecAddress, Fr, Fq, type Aliased } from '@aztec/aztec.js'
import type { LogFn } from '@aztec/foundation/log'
import type { AztecAsyncMap, AztecAsyncKVStore } from '@aztec/kv-store'
import { convertFromUTF8BufferAsString } from '../utils/conversion'
import { Buffer } from 'buffer'

export const AccountTypes = ['schnorr', 'ecdsasecp256r1', 'ecdsasecp256k1'] as const
export type AccountType = (typeof AccountTypes)[number]

export class WalletDB {
  private accounts: AztecAsyncMap<string, Uint8Array>
  private aliases: AztecAsyncMap<string, Uint8Array>
  private bridgedFeeJuice: AztecAsyncMap<string, Uint8Array>
  private userLog: LogFn

  private constructor(
    accounts: AztecAsyncMap<string, Uint8Array>,
    aliases: AztecAsyncMap<string, Uint8Array>,
    bridgedFeeJuice: AztecAsyncMap<string, Uint8Array>,
    userLog: LogFn,
  ) {
    this.accounts = accounts
    this.aliases = aliases
    this.bridgedFeeJuice = bridgedFeeJuice
    this.userLog = userLog
  }

  static init(store: AztecAsyncKVStore, userLog: LogFn) {
    const accounts = store.openMap<string, Uint8Array>('accounts')
    const aliases = store.openMap<string, Uint8Array>('aliases')
    const bridgedFeeJuice = store.openMap<string, Uint8Array>('bridgedFeeJuice')
    return new WalletDB(accounts, aliases, bridgedFeeJuice, userLog)
  }

  async pushBridgedFeeJuice(
    recipient: AztecAddress,
    secret: Fr,
    amount: bigint,
    leafIndex: bigint,
    log: LogFn = this.userLog,
  ) {
    const pointerKey = `${recipient.toString()}:stackPointer`
    const currentPointer = (await this.bridgedFeeJuice.getAsync(pointerKey))?.[0] ?? 0
    const stackPointer = currentPointer + 1
    const entry = `${amount.toString()}:${secret.toString()}:${leafIndex.toString()}`
    await this.bridgedFeeJuice.set(`${recipient.toString()}:${stackPointer}`, Buffer.from(entry))
    await this.bridgedFeeJuice.set(pointerKey, Buffer.from([stackPointer]))
    log(
      `Pushed ${amount} fee juice for recipient ${recipient.toString()}. Stack pointer ${stackPointer}`,
    )
  }

  async popBridgedFeeJuice(recipient: AztecAddress, log: LogFn = this.userLog) {
    const pointerKey = `${recipient.toString()}:stackPointer`
    let stackPointer = (await this.bridgedFeeJuice.getAsync(pointerKey))?.[0] ?? 0
    const result = await this.bridgedFeeJuice.getAsync(`${recipient.toString()}:${stackPointer}`)
    if (!result) {
      throw new Error(
        `No stored fee juice available for recipient ${recipient.toString()}. Please provide claim amount and secret. Stack pointer ${stackPointer}`,
      )
    }
    const [amountStr, secretStr, leafIndexStr] = Buffer.from(result).toString().split(':')
    stackPointer = Math.max(0, stackPointer - 1)
    await this.bridgedFeeJuice.set(pointerKey, Buffer.from([stackPointer]))
    log(
      `Retrieved ${amountStr} fee juice for recipient ${recipient.toString()}. Stack pointer ${stackPointer}`,
    )
    return {
      amount: BigInt(amountStr),
      secret: secretStr,
      leafIndex: BigInt(leafIndexStr),
    }
  }

  async storeAccount(
    address: AztecAddress,
    {
      type,
      secretKey,
      salt,
      alias,
      signingKey,
    }: {
      type: AccountType
      secretKey: Fr
      salt: Fr
      signingKey: Fq | Buffer
      alias?: string
    },
    log: LogFn = this.userLog,
  ) {
    if (alias) {
      await this.aliases.set(`accounts:${alias}`, Buffer.from(address.toString()))
    }
    await this.accounts.set(`${address.toString()}:type`, Buffer.from(type))
    await this.accounts.set(`${address.toString()}:sk`, secretKey.toBuffer())
    await this.accounts.set(`${address.toString()}:salt`, salt.toBuffer())
    const signingKeyBuffer =
      'toBuffer' in signingKey ? signingKey.toBuffer() : Buffer.from(signingKey)
    await this.accounts.set(`${address.toString()}:signingKey`, signingKeyBuffer)
    log(`Account stored in database${alias ? ` with alias ${alias}` : ''}`)
  }

  async storeSender(address: AztecAddress, alias: string, log: LogFn = this.userLog) {
    await this.aliases.set(`accounts:${alias}`, Buffer.from(address.toString()))
    log(`Account stored in database with alias ${alias} as a sender`)
  }

  async storeAccountMetadata(
    aliasOrAddress: AztecAddress | string,
    metadataKey: string,
    metadata: Buffer,
  ) {
    const { address } = await this.retrieveAccount(aliasOrAddress)
    await this.accounts.set(`${address.toString()}:${metadataKey}`, metadata)
  }

  async retrieveAccountMetadata(aliasOrAddress: AztecAddress | string, metadataKey: string) {
    const { address } = await this.retrieveAccount(aliasOrAddress)
    const result = await this.accounts.getAsync(`${address.toString()}:${metadataKey}`)
    if (!result) {
      throw new Error(
        `Could not find metadata with key ${metadataKey} for account ${aliasOrAddress}`,
      )
    }
    return Buffer.from(result)
  }

  async retrieveAccount(address: AztecAddress | string) {
    const secretKeyBuffer = await this.accounts.getAsync(`${address.toString()}:sk`)
    if (!secretKeyBuffer) {
      throw new Error(
        `Could not find ${address}:sk. Account "${address.toString}" does not exist on this wallet.`,
      )
    }
    const secretKey = Fr.fromBuffer(Buffer.from(secretKeyBuffer))
    const salt = Fr.fromBuffer(
      Buffer.from((await this.accounts.getAsync(`${address.toString()}:salt`))!),
    )
    const type = convertFromUTF8BufferAsString(
      (await this.accounts.getAsync(`${address.toString()}:type`))!,
    ) as AccountType
    const signingKey = Buffer.from(
      (await this.accounts.getAsync(`${address.toString()}:signingKey`))!,
    )
    return { address, secretKey, salt, type, signingKey }
  }

  async listAccounts(): Promise<Aliased<AztecAddress>[]> {
    const result: Aliased<AztecAddress>[] = []
    for await (const [alias, item] of this.aliases.entriesAsync()) {
      if (alias.startsWith('accounts:')) {
        const stringValue = convertFromUTF8BufferAsString(item)
        result.push({ alias, item: AztecAddress.fromString(stringValue) })
      }
    }
    return result
  }

  async listSenders(): Promise<Aliased<AztecAddress>[]> {
    const result: Aliased<AztecAddress>[] = []
    for await (const [alias, item] of this.aliases.entriesAsync()) {
      if (alias.startsWith('senders:')) {
        const stringValue = convertFromUTF8BufferAsString(item)
        result.push({ alias, item: AztecAddress.fromString(stringValue) })
      }
    }
    return result
  }

  async deleteAccount(address: AztecAddress) {
    await this.accounts.delete(`${address.toString()}:sk`)
    await this.accounts.delete(`${address.toString()}:salt`)
    await this.accounts.delete(`${address.toString()}:type`)
    await this.accounts.delete(`${address.toString()}:signingKey`)
    const accounts = await this.listAccounts()
    const account = accounts.find((acc) => address.equals(acc.item))
    if (account?.alias) {
      await this.aliases.delete(account.alias)
    }
  }
}
