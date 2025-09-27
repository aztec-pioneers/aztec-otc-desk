import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useToast from './useToast'

type BuyOrderPhase = 'idle' | 'signing' | 'waitingConfirmation' | 'success' | 'error'

type AmountRange = {
  min: number
  max: number
}

type BuyOrderPayload = {
  sellToken: string
  buyToken: string
  sellAmountRange: AmountRange
  buyAmountRange: AmountRange
}

type MockFailureStage = 'signature' | 'transaction'

const progressByPhase: Record<BuyOrderPhase, number> = {
  idle: 0,
  signing: 0,
  waitingConfirmation: 50,
  success: 100,
  error: 0,
}

const signatureDelay = 650
const transactionDelay = 1100

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type UseBuyOrderResult = {
  phase: BuyOrderPhase
  progress: number
  error: string | null
  initiateBuy: (payload: BuyOrderPayload, options?: { failStage?: MockFailureStage }) => Promise<boolean>
  reset: () => void
}

const useBuyOrder = (): UseBuyOrderResult => {
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

      setError(null)
      applyPhase('signing')

      try {
        await wait(signatureDelay)
        if (options?.failStage === 'signature') {
          throw new Error('Order signature rejected')
        }

        applyPhase('waitingConfirmation')

        await wait(transactionDelay)
        if (options?.failStage === 'transaction') {
          throw new Error('Order transaction reverted')
        }

        applyPhase('success')
        pushToast({
          message: `Buy order placed: Sell ${sellToken} (${sellAmountRange.min.toLocaleString()}-${sellAmountRange.max.toLocaleString()}) for ${buyToken} (${buyAmountRange.min.toLocaleString()}-${buyAmountRange.max.toLocaleString()})`,
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
