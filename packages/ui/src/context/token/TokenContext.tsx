import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
  type PropsWithChildren,
} from 'react'
import { TokenContractArtifact } from '@aztec/noir-contracts.js/Token'
import { TOKENS } from '../../data/tokens'
import { fetchTokenBalance } from '../../utils/token'
import WalletContext from '../wallet/WalletContext'
import { AztecAddress } from '@aztec/aztec.js'


export type TokenBalanceStatus = 'idle' | 'loading' | 'success' | 'error'

export type TokenBalanceEntry = {
  amount: bigint | undefined
  status: TokenBalanceStatus
  error?: string
}

export type TokenContextValue = {
  balances: Record<string, TokenBalanceEntry>
  ensureBalance: (symbol: string) => Promise<bigint | undefined>
  refreshBalance: (symbol: string) => Promise<bigint | undefined>
  setLocalBalance: (symbol: string, updater: (prev: bigint) => bigint) => void
  reset: () => void
}

const TokenContext = createContext<TokenContextValue | undefined>(undefined)

const buildInitialState = (): Record<string, TokenBalanceEntry> =>
  TOKENS.reduce<Record<string, TokenBalanceEntry>>((acc, token) => {
    acc[token.symbol] = { amount: undefined, status: 'idle' }
    return acc
  }, {})

export const TokenProvider = ({ children }: PropsWithChildren) => {
  const [balances, setBalances] = useState<Record<string, TokenBalanceEntry>>(buildInitialState)
  const inflightRequests = useRef<Record<string, Promise<bigint | undefined> | undefined>>({})
  const balancesRef = useRef(balances)

  const walletContext = useContext(WalletContext)
  if (!walletContext) {
    throw new Error('TokenProvider must be rendered within a WalletProvider')
  }

  const { wallet, node, activeAccount } = walletContext

  useEffect(() => {
    if (!wallet || !wallet.instance || !node) return
    const registerTokens = async () => {
      // todo: fix why this is not being recognized as defined
      for (const token of TOKENS) {
        try {
          const instance = await node.getContract(AztecAddress.fromString(token.address));
          if (!instance) throw new Error(`No instance for token contract at ${token.address} found!`);
          await wallet!.instance.registerContract(instance, TokenContractArtifact);
          console.log(`Registered token ${token.symbol} at ${token.address}`);
        } catch (error) {
          console.error(`Failed to register token ${token.symbol} at ${token.address}:`, error);
        }
        
      }
    }
    registerTokens()

  }, [wallet])


  const commitBalances = useCallback((updater: (prev: Record<string, TokenBalanceEntry>) => Record<string, TokenBalanceEntry>) => {
    setBalances((prev) => {
      const next = updater(prev)
      balancesRef.current = next
      return next
    })
  }, [])

  const setLocalBalance = useCallback((symbol: string, updater: (prev: bigint) => bigint) => {
    commitBalances((prev) => {
      const current = prev[symbol]
      if (!current) {
        return prev
      }
      const nextAmount = updater(current.amount ?? 0n)
      return {
        ...prev,
        [symbol]: {
          amount: nextAmount,
          status: 'success',
          error: undefined,
        },
      }
    })
  }, [commitBalances])

  const reset = useCallback(() => {
    inflightRequests.current = {}
    const initial = buildInitialState()
    balancesRef.current = initial
    setBalances(initial)
  }, [])

  const runFetch = useCallback(
    async (symbol: string, { force }: { force: boolean }) => {
      if (!wallet || !activeAccount) {
        return undefined
      }

      const cached = balancesRef.current[symbol]
      if (!cached) {
        return undefined
      }
      if (!force && cached.amount !== undefined) {
        return cached.amount
      }

      const existing = inflightRequests.current[symbol]
      if (existing) {
        return existing
      }

      commitBalances((prev) => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          status: 'loading',
          error: undefined,
        },
      }))

      const request = (async () => {
        try {
          const amount = await fetchTokenBalance(symbol, wallet.instance, activeAccount.address)
          commitBalances((prev) => ({
            ...prev,
            [symbol]: {
              amount,
              status: 'success',
              error: undefined,
            },
          }))
          return amount
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to fetch token balance'
          commitBalances((prev) => ({
            ...prev,
            [symbol]: {
              ...prev[symbol],
              status: 'error',
              error: message,
            },
          }))
          return undefined
        } finally {
          inflightRequests.current[symbol] = undefined
        }
      })()

      inflightRequests.current[symbol] = request
      return request
    },
    [commitBalances, wallet, activeAccount],
  )

  const ensureBalance = useCallback(
    (symbol: string) => runFetch(symbol, { force: false }),
    [runFetch],
  )

  const refreshBalance = useCallback(
    (symbol: string) => runFetch(symbol, { force: true }),
    [runFetch],
  )

  const value = useMemo<TokenContextValue>(
    () => ({ balances, ensureBalance, refreshBalance, setLocalBalance, reset }),
    [balances, ensureBalance, refreshBalance, setLocalBalance, reset],
  )

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}

export default TokenContext
