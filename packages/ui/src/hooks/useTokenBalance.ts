import { useContext, useMemo } from 'react'
import TokenContext from '../context/token/TokenContext'

const useTokenBalance = (symbol: string) => {
  const context = useContext(TokenContext)

  if (!context) {
    throw new Error('useTokenBalance must be used within a TokenProvider')
  }

  const { balances, ensureBalance, refreshBalance, setLocalBalance } = context
  const state = balances[symbol] ?? { amount: undefined, status: 'idle' as const, error: undefined }

  return useMemo(
    () => ({
      amount: state.amount,
      status: state.status,
      error: state.error,
      ensure: () => ensureBalance(symbol),
      refresh: () => refreshBalance(symbol),
      setLocalBalance: (updater: (prev: number) => number) => setLocalBalance(symbol, updater),
    }),
    [state.amount, state.status, state.error, ensureBalance, refreshBalance, setLocalBalance, symbol],
  )
}

export default useTokenBalance
