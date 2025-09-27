import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import useToast from './useToast'
import WalletContext from '../context/wallet/WalletContext'
import { formatBaseUnits } from '../utils/tokenAmount'
import { deployEscrow, depositToEscrow } from '../utils/escrow'
import { privateTransferAuthwit } from '../utils/token'
import type { EmbeddedWallet } from '../wallet/embeddedWallet'
import { createOTCDeskOrder } from '../utils/api'
import { TOKENS } from '../constants/tokens'

export type SellOrderPhase =
  | 'idle'
  | 'creatingEscrow'
  | 'creatingTransferAuthwit'
  | 'depositingToEscrow'
  | 'postingOrderToOTCDesk'
  | 'success'
  | 'error'

export const SELL_ORDER_PHASES: SellOrderPhase[] = [
  'creatingEscrow',
  'creatingTransferAuthwit',
  'depositingToEscrow',
  'postingOrderToOTCDesk',
]

const buildProgressByPhase = (): Record<SellOrderPhase, number> => {
  const count = SELL_ORDER_PHASES.length
  const segments = count + 1
  const entries = SELL_ORDER_PHASES.reduce<Record<SellOrderPhase, number>>((acc, phase, index) => {
    acc[phase] = ((index + 1) / segments) * 100
    return acc
  }, {} as Record<SellOrderPhase, number>)
  return {
    idle: 0,
    ...entries,
    success: 100,
    error: 0,
  }
}

export const SELL_ORDER_STATUS: Record<Exclude<SellOrderPhase, 'idle' | 'success' | 'error'>, string> = {
  creatingEscrow: 'Deploying escrow contract…',
  creatingTransferAuthwit: 'Preparing transfer authorisation…',
  depositingToEscrow: 'Depositing tokens into escrow…',
  postingOrderToOTCDesk: 'Posting order to OTC desk…',
}

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

const progressByPhase = buildProgressByPhase()

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
    throw new Error('Wallet context needed for sell order')
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
      applyPhase('creatingEscrow')



      try {
        // convert the tokens to addresses
        const sellTokenAddress = TOKENS.find(t => t.symbol === sellToken)?.address!
        const buyTokenAddress = TOKENS.find(t => t.symbol === buyToken)?.address!
        
        const { escrow, escrowSecretKey } = await deployEscrow(
          wallet.instance as EmbeddedWallet,
          activeAccount.address,
          sellTokenAddress,
          sellAmount,
          buyTokenAddress,
          buyAmount,
        )
        applyPhase('creatingTransferAuthwit')

        const { authwit, nonce } = await privateTransferAuthwit(
          wallet.instance,
          activeAccount.address,
          sellTokenAddress,
          sellAmount,
          escrow.address.toString(),
        )
        applyPhase('depositingToEscrow')

        await depositToEscrow(
          wallet.instance,
          activeAccount.address,
          escrow.address.toString(),
          authwit,
          nonce,
        )
        applyPhase('postingOrderToOTCDesk')

        await createOTCDeskOrder(
          escrow.address.toString(),
          escrow.instance,
          escrowSecretKey,
          await escrow.partialAddress,
          sellTokenAddress,
          sellAmount,
          buyTokenAddress,
          buyAmount,
        )
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
    [activeAccount, applyPhase, phase, pushToast, scheduleReset, wallet],
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
