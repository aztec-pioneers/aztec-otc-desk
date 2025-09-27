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

  const sellBalance = useTokenBalance(sellToken)

  useEffect(() => {
    if (sellBalance.amount === undefined && sellBalance.status === 'idle') {
      void sellBalance.ensure()
    }
  }, [sellBalance.amount, sellBalance.status, sellBalance.ensure])

  const { phase, progress, error: workflowError, initiateSale } = useSellOrder()

  const isProcessing = phase !== 'idle'
  const showProgress = phase !== 'idle'

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

  const progressLabel = useMemo(() => {
    switch (phase) {
      case 'idle':
        return 'Ready to submit order'
      case 'creatingEscrow':
        return 'Deploying escrow contract…'
      case 'creatingTransferAuthwit':
        return 'Preparing transfer authorisation…'
      case 'depositingToEscrow':
        return 'Depositing tokens into escrow…'
      case 'postingOrderToOTCDesk':
        return 'Posting order to OTC desk…'
      case 'success':
        return 'Sale complete'
      case 'error':
        return workflowError ?? 'Sale failed'
      default:
        return 'Processing order…'
    }
  }, [phase, workflowError])

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

    const success = await initiateSale({
      sellToken,
      sellAmount: parseDecimalAmount(sellToken, sellAmount),
      buyToken,
      buyAmount: parseDecimalAmount(buyToken, buyAmount),
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
                inputMode="numeric"
                pattern="[0-9]*"
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
                inputMode="numeric"
                pattern="[0-9]*"
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

          {showProgress ? (
            <div className="sell-view__progress" role="status" aria-live="polite">
              <div className="sell-view__progress-bar">
                <span className="sell-view__progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="sell-view__progress-label">{progressLabel}</span>
            </div>
          ) : null}
        </form>
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
