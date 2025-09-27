import type { Wallet } from '@aztec/aztec.js/wallet'
import { WalletSchema } from '@aztec/aztec.js/wallet'
import { promiseWithResolvers, type PromiseWithResolvers } from '@aztec/foundation/promise'
import { schemaHasMethod } from '@aztec/foundation/schemas'
import { jsonStringify } from '@aztec/foundation/json-rpc'

type WalletMethodName = {
  [K in keyof Wallet]-?: Wallet[K] extends (...args: infer _Args) => unknown ? K : never
}[keyof Wallet]

type WalletMethodArgs<Name extends WalletMethodName> = Wallet[Name] extends (
  ...args: infer Args
) => unknown
  ? Args
  : never

export class ExtensionWallet {
  private inFlight = new Map<string, PromiseWithResolvers<unknown>>()

  private constructor() {}

  static create(): Wallet {
    const wallet = new ExtensionWallet()
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return
      }

      const { messageId, response } = (event.data ?? {}) as {
        messageId?: string
        response?: { value?: unknown; error?: string }
      }
      if (!response || !messageId) {
        return
      }

      const entry = wallet.inFlight.get(messageId)
      if (!entry) {
        console.error('No in-flight message for id', messageId)
        return
      }

      const { resolve, reject } = entry
      const { value, error } = response
      if (error) {
        reject(new Error(error))
      } else {
        resolve(value)
      }
      wallet.inFlight.delete(messageId)
    })

    return new Proxy(wallet, {
      get: (target, prop) => {
        const methodName = prop.toString()
        if (schemaHasMethod(WalletSchema, methodName)) {
          return async (...args: WalletMethodArgs<WalletMethodName>) =>
            target.postMessage({ type: methodName as WalletMethodName, args })
        }
        return (target as unknown as Record<string | symbol, unknown>)[prop]
      },
    }) as unknown as Wallet
  }

  private async postMessage({
    type,
    args,
  }: {
    type: WalletMethodName
    args: WalletMethodArgs<WalletMethodName>
  }) {
    const messageId = globalThis.crypto.randomUUID()
    window.postMessage(jsonStringify({ type, args, messageId }), '*')
    const { promise, resolve, reject } = promiseWithResolvers<unknown>()
    this.inFlight.set(messageId, { promise, resolve, reject })
    return promise
  }
}
