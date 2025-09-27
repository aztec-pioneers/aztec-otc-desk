import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { type AztecNode, createAztecNodeClient, type Aliased } from '@aztec/aztec.js'
import type { Wallet } from '@aztec/aztec.js/wallet'
import { AztecAddress } from '@aztec/stdlib/aztec-address'
import type { EmbeddedWallet } from '../../wallet/embeddedWallet'

export type WalletStatus = 'disconnected' | 'connecting' | 'connected'
export type WalletProviderType = 'embedded' | 'extension'

export type WalletAccount = {
  address: string
  label: string
}

type WalletHandle =
  | { type: 'embedded'; instance: EmbeddedWallet }
  | { type: 'extension'; instance: Wallet }

export type WalletContextValue = {
  status: WalletStatus
  providerType?: WalletProviderType
  accounts: WalletAccount[]
  activeAccount?: WalletAccount
  wallet?: WalletHandle
  node?: AztecNode
  connect: (provider?: WalletProviderType) => Promise<void>
  disconnect: () => Promise<void>
  setActiveAccount: (address: string) => void
  refreshAccounts: () => Promise<WalletAccount[]>
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined)

const DEFAULT_NODE_URL = import.meta.env.VITE_AZTEC_NODE_URL ?? 'http://localhost:8080'

const normaliseAlias = (alias?: string) => alias?.replace(/^accounts:/, '') ?? ''

const mapEmbeddedAccounts = (accounts: Aliased<AztecAddress>[]): WalletAccount[] =>
  accounts
    .filter(({ alias }) => normaliseAlias(alias) !== 'minter')
    .map(({ item, alias }) => ({
      address: item.toString(),
      label: normaliseAlias(alias) || item.toString().slice(0, 10),
    }))

const mapExtensionAccounts = (accounts: unknown): WalletAccount[] => {
  if (!Array.isArray(accounts)) {
    return []
  }
  return accounts
    .map((account) => {
      if (!account) {
        return undefined
      }
      if (typeof account === 'string') {
        return { address: account, label: account.slice(0, 10) }
      }
      if (typeof account === 'object') {
        const maybeAddress = (account as { address?: string }).address
        if (maybeAddress) {
          const label = (account as { alias?: string }).alias ?? maybeAddress.slice(0, 10)
          return { address: maybeAddress, label }
        }
      }
      return undefined
    })
    .filter((value): value is WalletAccount => Boolean(value))
}

export const WalletProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<WalletStatus>('disconnected')
  const [providerType, setProviderType] = useState<WalletProviderType | undefined>(undefined)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [node, setNode] = useState<AztecNode | undefined>(undefined)
  const [activeAccountState, setActiveAccountState] = useState<WalletAccount | undefined>(undefined)

  const walletHandleRef = useRef<WalletHandle | undefined>(undefined)
  const activeAccountRef = useRef<WalletAccount | undefined>(undefined)

  const setActiveAccountInternal = useCallback((account?: WalletAccount) => {
    activeAccountRef.current = account
    setActiveAccountState(account)
  }, [])

  const disconnect = useCallback(async () => {
    const handle = walletHandleRef.current
    if (handle?.type === 'embedded') {
      const destroy = (handle.instance as unknown as { destroy?: () => Promise<void> }).destroy
      if (typeof destroy === 'function') {
        try {
          await destroy()
        } catch (error) {
          console.warn('Error while destroying embedded wallet', error)
        }
      }
    }
    walletHandleRef.current = undefined
    setStatus('disconnected')
    setProviderType(undefined)
    setAccounts([])
    setNode(undefined)
    setActiveAccountInternal(undefined)
  }, [setActiveAccountInternal])

  const refreshAccounts = useCallback(async () => {
    const handle = walletHandleRef.current
    let mapped: WalletAccount[] = []

    if (handle?.type === 'embedded') {
      const embeddedAccounts = await handle.instance.getAccounts()
      mapped = mapEmbeddedAccounts(embeddedAccounts)
    } else if (handle?.type === 'extension') {
      if (typeof handle.instance.getAccounts === 'function') {
        const extensionAccounts = await handle.instance.getAccounts()
        mapped = mapExtensionAccounts(extensionAccounts)
      }
    }

    setAccounts(mapped)

    if (mapped.length === 0) {
      setActiveAccountInternal(undefined)
    } else {
      const currentAddress = activeAccountRef.current?.address
      const nextActive = mapped.find((account) => account.address === currentAddress) ?? mapped[0]
      setActiveAccountInternal(nextActive)
    }

    return mapped
  }, [setActiveAccountInternal])

  const connect = useCallback(
    async (provider: WalletProviderType = 'embedded') => {
      if (status === 'connecting') {
        return
      }

      await disconnect()
      setStatus('connecting')
      setProviderType(provider)

      try {
        if (provider === 'embedded') {
          const { EmbeddedWallet } = await import('../../wallet/embeddedWallet')
          const wallet = await EmbeddedWallet.create(DEFAULT_NODE_URL)
          const node = createAztecNodeClient(DEFAULT_NODE_URL)
          setNode(node)
          walletHandleRef.current = { type: 'embedded', instance: wallet }
        } else {
          const { ExtensionWallet } = await import('../../wallet/extensionWallet')
          const wallet = ExtensionWallet.create()
          walletHandleRef.current = { type: 'extension', instance: wallet }
        }

        await refreshAccounts()
        setStatus('connected')
      } catch (error) {
        console.error('Failed to connect wallet', error)
        await disconnect()
        throw error
      }
    },
    [disconnect, refreshAccounts, status],
  )

  const setActiveAccount = useCallback(
    (address: string) => {
      const current = activeAccountRef.current
      if (current?.address === address) {
        return
      }
      const nextAccount = accounts.find((account) => account.address === address)
      if (nextAccount) {
        setActiveAccountInternal(nextAccount)
      }
    },
    [accounts, setActiveAccountInternal],
  )

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      providerType,
      accounts,
      activeAccount: activeAccountState,
      wallet: walletHandleRef.current,
      node,
      connect,
      disconnect,
      setActiveAccount,
      refreshAccounts,
    }),
    [
      status,
      providerType,
      accounts,
      activeAccountState,
      connect,
      disconnect,
      setActiveAccount,
      refreshAccounts,
    ],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export default WalletContext
