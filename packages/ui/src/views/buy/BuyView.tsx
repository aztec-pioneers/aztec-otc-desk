import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEventHandler,
  type SetStateAction,
} from 'react'
import { useNavigate } from 'react-router-dom'
import TokenSelector from '../../components/token/TokenSelector'
import { TOKENS } from '../../data/tokens'
import useWallet from '../../hooks/useWallet'
import useBuyOrder from '../../hooks/useBuyOrder'
import useIsMobile from '../../hooks/useIsMobile'
import './BuyView.css'

const MAX_AMOUNT = 999_999_999
const SELL_DEFAULT = 'USDC'
const BUY_DEFAULT = 'ETH'

type AmountField = {
  value: string
  error: string | null
}

const createAmountField = (): AmountField => ({ value: '', error: null })

const sanitiseAmount = (raw: string) => {
  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (!digitsOnly) {
    return { value: '', error: null }
  }

  const parsed = Number(digitsOnly)
  if (Number.isNaN(parsed)) {
    return { value: digitsOnly, error: 'Enter a valid amount' }
  }

  if (parsed > MAX_AMOUNT) {
    return { value: String(MAX_AMOUNT), error: 'Maximum amount is 999,999,999' }
  }

  if (parsed === 0) {
    return { value: '0', error: 'Amount must be greater than zero' }
  }

  return { value: String(parsed), error: null }
}

const BuyViewContent = () => {
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

  const [sellMin, setSellMin] = useState<AmountField>(createAmountField)
  const [sellMax, setSellMax] = useState<AmountField>(createAmountField)
  const [buyMin, setBuyMin] = useState<AmountField>(createAmountField)
  const [buyMax, setBuyMax] = useState<AmountField>(createAmountField)

  const { phase, progress, error: workflowError, initiateBuy } = useBuyOrder()

  const updatingSetter = (setter: Dispatch<SetStateAction<AmountField>>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitiseAmount(event.target.value)
      setter({ value: sanitized.value, error: sanitized.error })
    }

  const handleSellMinChange = updatingSetter(setSellMin)
  const handleSellMaxChange = updatingSetter(setSellMax)
  const handleBuyMinChange = updatingSetter(setBuyMin)
  const handleBuyMaxChange = updatingSetter(setBuyMax)

  const sellRangeFilled = Boolean(sellMin.value) && Boolean(sellMax.value)
  const buyRangeFilled = Boolean(buyMin.value) && Boolean(buyMax.value)

  const sellRangeOrderInvalid =
    sellRangeFilled &&
    !sellMin.error &&
    !sellMax.error &&
    Number(sellMin.value) > Number(sellMax.value)

  const buyRangeOrderInvalid =
    buyRangeFilled &&
    !buyMin.error &&
    !buyMax.error &&
    Number(buyMin.value) > Number(buyMax.value)

  const sellMinErrorMessage = sellMin.error ?? (sellRangeOrderInvalid ? 'Min amount must be <= max amount' : null)
  const sellMaxErrorMessage = sellMax.error ?? (sellRangeOrderInvalid ? 'Max amount must be >= min amount' : null)
  const buyMinErrorMessage = buyMin.error ?? (buyRangeOrderInvalid ? 'Min amount must be <= max amount' : null)
  const buyMaxErrorMessage = buyMax.error ?? (buyRangeOrderInvalid ? 'Max amount must be >= min amount' : null)

  const isProcessing = phase !== 'idle'
  const showProgress = phase !== 'idle'
  const sellRangeInvalid =
    !sellRangeFilled || Boolean(sellMin.error) || Boolean(sellMax.error) || sellRangeOrderInvalid
  const buyRangeInvalid =
    !buyRangeFilled || Boolean(buyMin.error) || Boolean(buyMax.error) || buyRangeOrderInvalid
  const confirmDisabled = isProcessing || sellRangeInvalid || buyRangeInvalid

  const progressLabel = useMemo(() => {
    switch (phase) {
      case 'idle':
        return 'Ready to submit order'
      case 'signing':
        return 'Awaiting order signature…'
      case 'waitingConfirmation':
        return 'Confirming order…'
      case 'success':
        return 'Buy order placed'
      case 'error':
        return workflowError ?? 'Order failed'
      default:
        return 'Processing order…'
    }
  }, [phase, workflowError])

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (confirmDisabled) {
      return
    }

    const success = await initiateBuy({
      sellToken,
      buyToken,
      sellAmountRange: { min: Number(sellMin.value), max: Number(sellMax.value) },
      buyAmountRange: { min: Number(buyMin.value), max: Number(buyMax.value) },
    })

    if (success) {
      setSellMin(createAmountField())
      setSellMax(createAmountField())
      setBuyMin(createAmountField())
      setBuyMax(createAmountField())
    }
  }

  return (
    <section className="buy-view">
      <header className="buy-view__header">
        <h1>Find a Buy Order</h1>
        <p>Define the asset you want to sell and the asset you expect in return, including acceptable ranges.</p>
      </header>

      <div className="buy-view__panel">
        <form className={`buy-view__form${isProcessing ? ' buy-view__form--disabled' : ''}`} onSubmit={handleSubmit}>
          <fieldset className="buy-view__field" disabled={isProcessing}>
            <TokenSelector
              label="Sell token"
              value={sellToken}
              onChange={setSellToken}
              tokens={sellTokens}
            />
            <div className="buy-view__range">
              <label className="buy-view__amount" htmlFor="sell-min">
                <span>Min amount</span>
                <input
                  id="sell-min"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={sellMin.value}
                  onChange={handleSellMinChange}
                  disabled={isProcessing}
                  placeholder="0"
                  maxLength={9}
                />
                {sellMinErrorMessage ? (
                  <span className="buy-view__field-error">{sellMinErrorMessage}</span>
                ) : null}
              </label>
              <label className="buy-view__amount" htmlFor="sell-max">
                <span>Max amount</span>
                <input
                  id="sell-max"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={sellMax.value}
                  onChange={handleSellMaxChange}
                  disabled={isProcessing}
                  placeholder="0"
                  maxLength={9}
                />
                {sellMaxErrorMessage ? (
                  <span className="buy-view__field-error">{sellMaxErrorMessage}</span>
                ) : null}
              </label>
            </div>
          </fieldset>

          <fieldset className="buy-view__field" disabled={isProcessing}>
            <TokenSelector
              label="Buy token"
              value={buyToken}
              onChange={setBuyToken}
              tokens={buyTokens}
            />
            <div className="buy-view__range">
              <label className="buy-view__amount" htmlFor="buy-min">
                <span>Min amount</span>
                <input
                  id="buy-min"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={buyMin.value}
                  onChange={handleBuyMinChange}
                  disabled={isProcessing}
                  placeholder="0"
                  maxLength={9}
                />
                {buyMinErrorMessage ? (
                  <span className="buy-view__field-error">{buyMinErrorMessage}</span>
                ) : null}
              </label>
              <label className="buy-view__amount" htmlFor="buy-max">
                <span>Max amount</span>
                <input
                  id="buy-max"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={buyMax.value}
                  onChange={handleBuyMaxChange}
                  disabled={isProcessing}
                  placeholder="0"
                  maxLength={9}
                />
                {buyMaxErrorMessage ? (
                  <span className="buy-view__field-error">{buyMaxErrorMessage}</span>
                ) : null}
              </label>
            </div>
          </fieldset>

          <button type="submit" className="buy-view__submit" disabled={confirmDisabled}>
            Confirm order
          </button>

          {showProgress ? (
            <div className="buy-view__progress" role="status" aria-live="polite">
              <div className="buy-view__progress-bar">
                <span className="buy-view__progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="buy-view__progress-label">{progressLabel}</span>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  )
}

const BuyView = () => {
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
      <section className="buy-view buy-view--locked">
        <p>Please connect a wallet to proceed!</p>
      </section>
    )
  }

  return <BuyViewContent />
}

export default BuyView
