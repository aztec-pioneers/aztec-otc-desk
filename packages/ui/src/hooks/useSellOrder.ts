import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useToast from './useToast'

type SellOrderPhase =
  | 'idle'
  | 'signingEscrow'
  | 'waitingEscrowConfirmation'
  | 'signingDeposit'
  | 'waitingDepositConfirmation'
  | 'success'
  | 'error'

type SellOrderPayload = {
  sellToken: string
  sellAmount: number
  buyToken: string
  buyAmount: number
}

type MockFailureStage =
  | 'escrowSignature'
  | 'escrowTransaction'
  | 'depositSignature'
  | 'depositTransaction'

const progressByPhase: Record<SellOrderPhase, number> = {
  idle: 0,
  signingEscrow: 0,
  waitingEscrowConfirmation: 25,
  signingDeposit: 50,
  waitingDepositConfirmation: 75,
  success: 100,
  error: 0,
}

const delay = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration))

const signatureDelay = 650
const transactionDelay = 1200

export type SellOrderOptions = {
  failStage?: MockFailureStage
}

export type UseSellOrderResult = {
  phase: SellOrderPhase
  progress: number
  error: string | null
  initiateSale: (payload: SellOrderPayload, options?: SellOrderOptions) => Promise<boolean>
  reset: () => void
}

const useSellOrder = (): UseSellOrderResult => {
  const [phase, setPhase] = useState<SellOrderPhase>('idle')
  const [progress, setProgress] = useState(progressByPhase.idle)
  const [error, setError] = useState<string | null>(null)
  const { pushToast } = useToast()
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingReset = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
  }, [])

  const applyPhase = useCallback((next: SellOrderPhase) => {
    setPhase(next)
    setProgress(progressByPhase[next])
  }, [])

  const reset = useCallback(() => {
    clearPendingReset()
    applyPhase('idle')
    setError(null)
  }, [applyPhase, clearPendingReset])

  useEffect(() => () => clearPendingReset(), [clearPendingReset])

  const scheduleReset = useCallback(
    (delayMs: number) => {
      clearPendingReset()
      resetTimeoutRef.current = setTimeout(() => {
        applyPhase('idle')
        setError(null)
        resetTimeoutRef.current = null
      }, delayMs)
    },
    [applyPhase, clearPendingReset],
  )

  const simulateSignature = useCallback(async (label: string, shouldFail: boolean) => {
    await delay(signatureDelay)
    if (shouldFail) {
      throw new Error(`${label} signature rejected`)
    }
  }, [])

  const simulateTransaction = useCallback(async (label: string, shouldFail: boolean) => {
    await delay(transactionDelay)
    if (shouldFail) {
      throw new Error(`${label} transaction reverted`)
    }
  }, [])

  const initiateSale = useCallback<
    UseSellOrderResult['initiateSale']
  >(
    async ({ sellToken, sellAmount, buyToken, buyAmount }, options) => {
      if (phase !== 'idle') {
        return false
      }

      setError(null)
      applyPhase('signingEscrow')

      try {
        await simulateSignature('Escrow creation', options?.failStage === 'escrowSignature')
        applyPhase('waitingEscrowConfirmation')

        await simulateTransaction('Escrow creation', options?.failStage === 'escrowTransaction')
        applyPhase('signingDeposit')

        await simulateSignature('Escrow deposit', options?.failStage === 'depositSignature')
        applyPhase('waitingDepositConfirmation')

        await simulateTransaction('Escrow deposit', options?.failStage === 'depositTransaction')
        applyPhase('success')

        pushToast({
          message: `Sale submitted: Sell ${sellAmount.toLocaleString()} ${sellToken} for ${buyAmount.toLocaleString()} ${buyToken}`,
          variant: 'success',
        })

        scheduleReset(1200)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit sale order'
        setError(message)
        applyPhase('error')
        pushToast({ message, variant: 'error' })
        scheduleReset(800)
        return false
      }
    },
    [applyPhase, phase, pushToast, scheduleReset, simulateSignature, simulateTransaction],
  )

  return useMemo(
    () => ({
      phase,
      progress,
      error,
      initiateSale,
      reset,
    }),
    [phase, progress, error, initiateSale, reset],
  )
}

export default useSellOrder
