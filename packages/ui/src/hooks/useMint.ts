import { useCallback, useContext, useState } from 'react'
import WalletContext from '../context/wallet/WalletContext'
import { mintTokens } from '../utils/token'

export type MintStatus = 'idle' | 'pending' | 'success' | 'error'

export type MintResult =
  | { success: true; txHash: string }
  | { success: false; message: string }

const useMint = () => {
  const walletContext = useContext(WalletContext)
  if (!walletContext) {
    throw new Error('Wallet context needed for mint')
  }

  const { wallet, activeAccount } = walletContext

  const [status, setStatus] = useState<MintStatus>('idle')
  const [lastResult, setLastResult] = useState<MintResult | null>(null)

  const mint = useCallback(
    async (symbol: string, amount: bigint) => {
      setStatus('pending')
      setLastResult(null)

      if (!wallet?.instance || !activeAccount) {
        const message = 'Wallet not connected'
        const failure: MintResult = { success: false, message }
        setStatus('error')
        setLastResult(failure)
        throw new Error(message)
      }

      try {
        const receipt = await mintTokens(symbol, amount, wallet.instance, activeAccount.address)
        const result: MintResult = { success: true, txHash: receipt.txHash.toString() }
        setStatus('success')
        setLastResult(result)
        return result
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Mint failed for ${symbol}. Please try again.`
        const failure: MintResult = { success: false, message }
        setStatus('error')
        setLastResult(failure)
        throw new Error(message)
      }
    },
    [wallet, activeAccount],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setLastResult(null)
  }, [])

  return { status, lastResult, mint, reset }
}

export default useMint
