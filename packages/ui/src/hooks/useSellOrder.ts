import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useToast from './useToast'
import WalletContext from '../context/wallet/WalletContext'
import { formatBaseUnits } from '../utils/tokenAmount'
import { deployEscrow, depositToEscrow } from '../utils/escrow'
import { privateTransferAuthwit } from '../utils/token'
import type { EmbeddedWallet } from '../wallet/embeddedWallet'
import { createOTCDeskOrder } from '../utils/api'

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
  sellAmount: bigint
  buyToken: string
  buyAmount: bigint
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
  const walletContext = useContext(WalletContext)
  if (!walletContext) {
    throw new Error('Wallet context needed for mint')
  }
  const { wallet, activeAccount } = walletContext

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
      if (!wallet || !wallet.instance || !activeAccount) {
        const message = 'Wallet not connected'
        setError(message)
        pushToast({ message, variant: 'error' })
        return false
      }

      setError(null)
      applyPhase('signingEscrow')

      try {
        // deploy the escrow contract
        const { escrow, escrowSecretKey } = await deployEscrow(
          // todo: handle extension wallet needing pxe access
          wallet.instance as EmbeddedWallet,
          activeAccount.address,
          sellToken,
          sellAmount,
          buyToken,
          buyAmount,
        );
        applyPhase('deployEscrow');

        // create authwit for deposit
        const { authwit, nonce } = await privateTransferAuthwit(
          wallet.instance,
          activeAccount.address,
          sellToken,
          sellAmount,
          escrow.address.toString(),
        );
        applyPhase('createAuthwit');

        // deposit tokens into escrow
        const depositReceipt = await depositToEscrow(
          wallet.instance,
          activeAccount.address,
          escrow.address.toString(),
          authwit,
          nonce
        );
        applyPhase('depositTokens')

        // push the escrow to the OTC Desk Matching Engine API
        await createOTCDeskOrder(
          escrow.address.toString(),
          escrow.instance,
          escrowSecretKey,
          await escrow.partialAddress,
          sellToken,
          sellAmount,
          buyToken,
          buyAmount
        );
        applyPhase('success')

        pushToast({
          message: `Sell order submitted: Sell ${formatBaseUnits(sellToken, sellAmount)} ${sellToken} for ${formatBaseUnits(buyToken, buyAmount)} ${buyToken}`,
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
