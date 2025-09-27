import { useCallback, useState } from 'react'
import { executeMint, type MintResult } from '../services/fakeMint'

export type MintStatus = 'idle' | 'pending' | 'success' | 'error'

const useMint = () => {
  const [status, setStatus] = useState<MintStatus>('idle')
  const [lastResult, setLastResult] = useState<MintResult | null>(null)

  const mint = useCallback(async (symbol: string, amount: number) => {
    setStatus('pending')
    setLastResult(null)

    try {
      const result = await executeMint(symbol, amount)
      setStatus(result.success ? 'success' : 'error')
      setLastResult(result)
      if (!result.success) {
        throw new Error(result.message)
      }
      return result
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Mint failed for ${symbol}. Please try again.`
      setStatus('error')
      setLastResult({ success: false, message })
      throw new Error(message)
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setLastResult(null)
  }, [])

  return { status, lastResult, mint, reset }
}

export default useMint
