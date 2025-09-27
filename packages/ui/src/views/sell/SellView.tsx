import { useEffect, useMemo, useState, type ChangeEvent, type FormEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import TokenSelector from '../../components/token/TokenSelector'
import { TOKENS } from '../../constants/tokens'
import useSellOrder from '../../hooks/useSellOrder'
import useWallet from '../../hooks/useWallet'
import useIsMobile from '../../hooks/useIsMobile'
import { clampDecimalInput, formatBaseUnits, parseDecimalAmount } from '../../utils/tokenAmount'
import useTokenBalance from '../../hooks/useTokenBalance'
import Spinner from '../../components/primitives/Spinner'
import SwapCircle from '../../components/icons/SwapCircle'
import ProgressModal from '../../components/orders/ProgressModal'
import { SELL_ORDER_PHASES, SELL_ORDER_STATUS } from '../../hooks/useSellOrder'
import './SellView.css'

const SELL_DEFAULT = 'ETH'
const BUY_DEFAULT = 'USDC'

const SellViewContent = () => {
  const [sellToken, setSellToken] = useState(SELL_DEFAULT)
  const [buyToken, setBuyToken] = useState(BUY_DEFAULT)

  const sellTokens = useMemo(
    () => TOKENS.filter((token) => token.symbol !== buyToken),
    [buyToken],
  )
  const buyTokens = useMemo(
    () => TOKENS.filter((token) => token.symbol !== sellToken),
    [sellToken],
  )

  useEffect(() => {
    if (!sellTokens.find((token) => token.symbol === sellToken)) {
      setSellToken(sellTokens[0]?.symbol ?? SELL_DEFAULT)
    }
  }, [sellToken, sellTokens])

  useEffect(() => {
    if (!buyTokens.find((token) => token.symbol === buyToken)) {
      setBuyToken(buyTokens[0]?.symbol ?? BUY_DEFAULT)
    }
  }, [buyToken, buyTokens])

  const [sellAmount, setSellAmount] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellError, setSellError] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [submittedBaseAmounts, setSubmittedBaseAmounts] = useState<{ sell: bigint; buy: bigint } | null>(null)

  const { phase, progress, error: workflowError, initiateSale } = useSellOrder()
  const [progressModalOpen, setProgressModalOpen] = useState(false)

  const sellBalance = useTokenBalance(sellToken)

  useEffect(() => {
    if (sellBalance.amount === undefined && sellBalance.status === 'idle') {
      void sellBalance.ensure()
    }
  }, [sellBalance.amount, sellBalance.status, sellBalance.ensure])

  useEffect(() => {
    if (phase !== 'idle') {
      setProgressModalOpen(true)
    } else {
      setProgressModalOpen(false)
      setSubmittedBaseAmounts(null)
    }
  }, [phase])

  const isProcessing = phase !== 'idle'

  const handleSellAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = clampDecimalInput(sellToken, event.target.value, sellBalance.amount)
    setSellAmount(next.display)
    setSellError(next.error)
  }

  const handleBuyAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = clampDecimalInput(buyToken, event.target.value)
    setBuyAmount(next.display)
    setBuyError(next.error)
  }

  const invalidSell = Boolean(sellError) || !sellAmount
  const invalidBuy = Boolean(buyError) || !buyAmount
  const formDisabled = invalidSell || invalidBuy
  const confirmDisabled = formDisabled || isProcessing

  const getDisplayAmount = (symbol: string, amountString: string, submitted?: bigint | null) => {
    try {
      if (submitted !== undefined && submitted !== null) {
        return formatBaseUnits(symbol, submitted)
      }
      if (!amountString) {
        return formatBaseUnits(symbol, BigInt(0))
      }
      return formatBaseUnits(symbol, parseDecimalAmount(symbol, amountString))
    } catch (error) {
      return amountString || '0'
    }
  }

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (confirmDisabled) {
      if (invalidSell) {
        setSellError((prev) => prev ?? 'Enter a valid amount')
      }
      if (invalidBuy) {
        setBuyError((prev) => prev ?? 'Enter a valid amount')
      }
      return
    }

    const sellBase = parseDecimalAmount(sellToken, sellAmount || '0')
    const buyBase = parseDecimalAmount(buyToken, buyAmount || '0')
    setSubmittedBaseAmounts({ sell: sellBase, buy: buyBase })

    const success = await initiateSale({
      sellToken,
      sellAmount: sellBase,
      buyToken,
      buyAmount: buyBase,
    })

    if (success) {
      setSellAmount('')
      setBuyAmount('')
      setSellError(null)
      setBuyError(null)
    }
  }

  return (
    <section className="sell-view">
      <header className="sell-view__header">
        <h1>Initiate a Sale</h1>
        <p>Define your sell leg and desired buy asset to create an escrow-backed offer.</p>
      </header>

      <div className="sell-view__panel">
        <form className={`sell-view__form${isProcessing ? ' sell-view__form--disabled' : ''}`} onSubmit={handleSubmit}>
          <fieldset className="sell-view__field" disabled={isProcessing}>
            <TokenSelector
              label="Sell token"
              value={sellToken}
              onChange={setSellToken}
              tokens={sellTokens}
            />
            <div className="sell-view__balance">
              <span className="sell-view__balance-label">Available:</span>
              <div className="sell-view__balance-value">
                {sellBalance.status === 'loading' || (sellBalance.status === 'idle' && sellBalance.amount === undefined) ? (
                  <span className="sell-view__balance-loading">
                    <Spinner size="sm" label="Fetching balance" />
                    <span>Fetching…</span>
                  </span>
                ) : sellBalance.status === 'error' ? (
                  <span className="sell-view__balance-error">{sellBalance.error ?? 'Unavailable'}</span>
                ) : (
                  <span>{sellBalance.amount !== undefined ? formatBaseUnits(sellToken, sellBalance.amount) : '—'}</span>
                )}
                {(sellBalance.status === 'success' || sellBalance.status === 'error') && (
                  <button
                    type="button"
                    className="sell-view__balance-refresh"
                    onClick={() => sellBalance.refresh()}
                  >
                    refresh
                  </button>
                )}
              </div>
            </div>
            <label className="sell-view__amount" htmlFor="sell-amount">
              <span>Sell amount</span>
              <input
                id="sell-amount"
                type="text"
                inputMode="decimal"
                value={sellAmount}
                onChange={handleSellAmountChange}
                disabled={isProcessing}
                placeholder="0"
                maxLength={9}
              />
              {sellError ? <span className="sell-view__field-error">{sellError}</span> : null}
            </label>
          </fieldset>

          <div className="sell-view__switch">
            <button
              type="button"
              className="sell-view__switch-button"
              onClick={() => {
                setSellToken(buyToken)
                setBuyToken(sellToken)
                setSellAmount(buyAmount)
                setBuyAmount(sellAmount)
                setSellError(null)
                setBuyError(null)
              }}
              disabled={isProcessing}
            >
              <SwapCircle className="sell-view__switch-icon" />
            </button>
          </div>

          <fieldset className="sell-view__field" disabled={isProcessing}>
            <TokenSelector
              label="Buy token"
              value={buyToken}
              onChange={setBuyToken}
              tokens={buyTokens}
            />
            <label className="sell-view__amount" htmlFor="buy-amount">
              <span>Buy amount</span>
              <input
                id="buy-amount"
                type="text"
                inputMode="decimal"
                value={buyAmount}
                onChange={handleBuyAmountChange}
                disabled={isProcessing}
                placeholder="0"
                maxLength={9}
              />
              {buyError ? <span className="sell-view__field-error">{buyError}</span> : null}
            </label>
          </fieldset>

          <button type="submit" className="sell-view__submit" disabled={confirmDisabled}>
            Confirm order
          </button>

        </form>
        <ProgressModal
          open={progressModalOpen}
          onClose={() => setProgressModalOpen(false)}
          title="Executing Order Creation"
          phases={SELL_ORDER_PHASES}
          activePhase={phase}
          statusMessages={SELL_ORDER_STATUS}
          progressPercent={progress}
          summary={{
            sellToken,
            sellAmount: getDisplayAmount(sellToken, sellAmount, submittedBaseAmounts?.sell),
            buyToken,
            buyAmount: getDisplayAmount(buyToken, buyAmount, submittedBaseAmounts?.buy),
          }}
          error={phase === 'error' ? workflowError : null}
        />
      </div>
    </section>
  )
}

const SellView = () => {
  const { status } = useWallet()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  useEffect(() => {
    if (isMobile) {
      navigate('/', { replace: true })
    }
  }, [isMobile, navigate])

  if (isMobile) {
    return null
  }

  if (status !== 'connected') {
    return (
      <section className="sell-view sell-view--locked">
        <p>Please connect a wallet to proceed!</p>
      </section>
    )
  }

  return <SellViewContent />
}

export default SellView
