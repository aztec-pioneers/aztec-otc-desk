import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useToast from './useToast'
import WalletContext from '../context/wallet/WalletContext'
import { formatBaseUnits } from '../utils/tokenAmount'
import { closeOrder, requestOTCMatch } from '../utils/api'
import { TOKENS } from '../constants/tokens'
import { privateTransferAuthwit } from '../utils/token'
import { fillOTCOrder } from '../utils/escrow'

export type BuyOrderPhase =
  | 'idle'
  | 'matchingOrder'
  | 'creatingTransferAuthwit'
  | 'executingOTCOrder'
  | 'closingOrderInOTCDesk'
  | 'success'
  | 'error'

type AmountRange = {
  min: bigint
  max: bigint
}

type BuyOrderPayload = {
  sellToken: string
  buyToken: string
  sellAmountRange: AmountRange
  buyAmountRange: AmountRange
}

type MockFailureStage = 'signature' | 'transaction'

export const BUY_ORDER_PHASES: BuyOrderPhase[] = [
  'matchingOrder',
  'creatingTransferAuthwit',
  'executingOTCOrder',
  'closingOrderInOTCDesk',
]

const buildProgressByPhase = (): Record<BuyOrderPhase, number> => {
  const segments = BUY_ORDER_PHASES.length + 1
  const entries = BUY_ORDER_PHASES.reduce<Record<BuyOrderPhase, number>>((acc, phase, idx) => {
    acc[phase] = ((idx + 1) / segments) * 100
    return acc
  }, {} as Record<BuyOrderPhase, number>)
  return {
    idle: 0,
    ...entries,
    success: 100,
    error: 0,
  }
}

export const BUY_ORDER_STATUS: Record<Exclude<BuyOrderPhase, 'idle' | 'success' | 'error'>, string> = {
  matchingOrder: 'Finding a matching sell order…',
  creatingTransferAuthwit: 'Preparing transfer authorisation…',
  executingOTCOrder: 'Executing matched order…',
  closingOrderInOTCDesk: 'Closing order with OTC desk…',
}

const progressByPhase = buildProgressByPhase()

export type UseBuyOrderResult = {
  phase: BuyOrderPhase
  progress: number
  error: string | null
  initiateBuy: (payload: BuyOrderPayload, options?: { failStage?: MockFailureStage }) => Promise<boolean>
  reset: () => void
}

const useBuyOrder = (): UseBuyOrderResult => {
  const walletContext = useContext(WalletContext)
  if (!walletContext) {
    throw new Error('Wallet context needed for sell order')
  }

  const { wallet, activeAccount } = walletContext
  const [phase, setPhase] = useState<BuyOrderPhase>('idle')
  const [progress, setProgress] = useState(progressByPhase.idle)
  const [error, setError] = useState<string | null>(null)
  const { pushToast } = useToast()
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyPhase = useCallback((next: BuyOrderPhase) => {
    setPhase(next)
    setProgress(progressByPhase[next])
  }, [])

  const clearReset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
  }, [])

  const scheduleReset = useCallback(
    (delayMs: number) => {
      clearReset()
      resetTimeoutRef.current = setTimeout(() => {
        applyPhase('idle')
        setError(null)
        resetTimeoutRef.current = null
      }, delayMs)
    },
    [applyPhase, clearReset],
  )

  useEffect(() => () => clearReset(), [clearReset])

  const initiateBuy = useCallback<UseBuyOrderResult['initiateBuy']>(
    async ({ sellToken, sellAmountRange, buyToken, buyAmountRange }, options) => {
      if (phase !== 'idle') {
        return false
      }
      if (!wallet || !wallet.instance || !activeAccount) {
        const message = 'Wallet not connected'
        setError(message)
        pushToast({ message, variant: 'error' })
        return false
      }

      setError(null)
      applyPhase('matchingOrder')

      try {
        const sellTokenAddress = TOKENS.find(t => t.symbol === sellToken)?.address!
        const buyTokenAddress = TOKENS.find(t => t.symbol === buyToken)?.address!

        const order = await requestOTCMatch(
          sellTokenAddress,
          buyTokenAddress,
          buyAmountRange.min, // swapped because we are the buyer
          buyAmountRange.max,
          sellAmountRange.min,
          sellAmountRange.max,
        );
        if (!order) {
          const message =
            'The requested order was not able to be matched - try adjusting your buy offer or creating a sell offer!'
          setError(message)
          applyPhase('error')
          pushToast({ message, variant: 'error' })
          scheduleReset(1200)
          return false
        }
        applyPhase('creatingTransferAuthwit')

        const { authwit, nonce } = await privateTransferAuthwit(
          wallet.instance,
          activeAccount.address,
          sellTokenAddress,
          order.buyTokenAmount as bigint,
          order.escrowAddress,
        )
        applyPhase('executingOTCOrder')

        const fillReceipt = await fillOTCOrder(
          wallet.instance,
          activeAccount.address,
          order,
          authwit,
          nonce
        );
        applyPhase('closingOrderInOTCDesk')

        await closeOrder(order.orderId);

        applyPhase('success')
        pushToast({
          message: `Buy order placed: Sell ${sellToken} (${formatBaseUnits(sellToken, sellAmountRange.min)}-${formatBaseUnits(sellToken, sellAmountRange.max)}) for ${buyToken} (${formatBaseUnits(buyToken, buyAmountRange.min)}-${formatBaseUnits(buyToken, buyAmountRange.max)})\nTx hash: ${fillReceipt.txHash.toString()}`,
          variant: 'success',
        })

        scheduleReset(1200)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Buy order failed'
        setError(message)
        applyPhase('error')
        pushToast({ message, variant: 'error' })
        scheduleReset(800)
        return false
      }
    },
    [applyPhase, phase, pushToast, scheduleReset],
  )

  const reset = useCallback(() => {
    clearReset()
    applyPhase('idle')
    setError(null)
  }, [applyPhase, clearReset])

  return useMemo(
    () => ({ phase, progress, error, initiateBuy, reset }),
    [phase, progress, error, initiateBuy, reset],
  )
}

export default useBuyOrder
