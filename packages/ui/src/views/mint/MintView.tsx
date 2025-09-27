import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TokenSelector from '../../components/token/TokenSelector'
import Spinner from '../../components/primitives/Spinner'
import { DEFAULT_TOKEN_SYMBOL } from '../../data/tokens'
import useTokenBalance from '../../hooks/useTokenBalance'
import useMint from '../../hooks/useMint'
import useToast from '../../hooks/useToast'
import useWallet from '../../hooks/useWallet'
import useIsMobile from '../../hooks/useIsMobile'
import { formatBaseUnits, toBaseUnits } from '../../utils/tokenAmount'
import './MintView.css'

const MintViewContent = () => {
  const [selectedToken, setSelectedToken] = useState(DEFAULT_TOKEN_SYMBOL)
  const { amount, status, error, ensure, refresh, setLocalBalance } = useTokenBalance(selectedToken)
  const { status: mintStatus, mint, reset: resetMint } = useMint()
  const { pushToast } = useToast()
  const [mintValue, setMintValue] = useState('')
  const [mintError, setMintError] = useState<string | null>(null)

  const formattedBalance = useMemo(() => {
    if (amount === undefined) {
      return '—'
    }
    return formatBaseUnits(selectedToken, amount)
  }, [amount, selectedToken])

  useEffect(() => {
    if (amount === undefined && status === 'idle') {
      void ensure()
    }
  }, [amount, status, ensure])

  const balancePending = status === 'loading' || (status === 'idle' && amount === undefined)
  const mintPending = mintStatus === 'pending'

  const handleMintInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/[^0-9]/g, '')
    if (nextValue.length === 0) {
      setMintValue('')
      setMintError(null)
      return
    }

    const parsed = parseInt(nextValue, 10)
    if (Number.isNaN(parsed)) {
      setMintError('Enter a valid amount')
      return
    }

    if (parsed > 999_999_999) {
      setMintValue('999999999')
      setMintError('Maximum mint amount is 999,999,999')
      return
    }

    setMintValue(String(parsed))
    setMintError(parsed === 0 ? 'Cannot mint 0 tokens' : null)
  }

  const handleMintSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!mintValue) {
      setMintError('Enter an amount before minting')
      return
    }

    try {
      const parsedAmount = Number(mintValue)
      if (parsedAmount === 0) {
        const message = 'Cannot mint 0 tokens'
        setMintError(message)
        pushToast({ message, variant: 'error' })
        return
      }
      const baseAmount = toBaseUnits(selectedToken, parsedAmount)
      const result = await mint(selectedToken, baseAmount)
      if (result.success) {
        setLocalBalance((prev) => prev + baseAmount)
        setMintValue('')
        pushToast({
          message: `Minted ${formatBaseUnits(selectedToken, baseAmount)} ${selectedToken}. Tx: ${result.txHash}`,
          variant: 'success',
        })
      }
    } catch (err) {
      setMintError(err instanceof Error ? err.message : 'Mint failed')
      pushToast({ message: err instanceof Error ? err.message : 'Mint failed', variant: 'error' })
    }
  }

  useEffect(() => {
    if (mintStatus === 'success' || mintStatus === 'error') {
      const timeout = setTimeout(() => {
        resetMint()
        setMintError(null)
      }, 4000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [mintStatus, resetMint])

  return (
    <section className="mint-view">
      <header className="mint-view__header">
        <h1>Token Minting</h1>
        <p>Select a token to inspect balances and perform mint operations.</p>
      </header>

      <div className="mint-view__panel">
        <TokenSelector value={selectedToken} onChange={setSelectedToken} />

        <div className="mint-view__balance">
          <span className="mint-view__balance-label">Balance:</span>
          <div className="mint-view__balance-value">
            {balancePending ? (
              <div className="mint-view__balance-loading">
                <Spinner size="sm" label="Fetching balance" />
                <span>Fetching…</span>
              </div>
            ) : status === 'error' ? (
              <span className="mint-view__balance-error">{error ?? 'Unavailable'}</span>
            ) : (
              <span>{formattedBalance}</span>
            )}
            {(status === 'success' || status === 'error') && (
              <button type="button" className="mint-view__refresh" onClick={() => refresh()}>
                refresh
              </button>
            )}
          </div>
        </div>

        {!balancePending ? (
          <form className="mint-view__form" onSubmit={handleMintSubmit}>
            <label className="mint-view__input-label" htmlFor="mint-amount">
              Mint amount
              <input
                id="mint-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mintValue}
                onChange={handleMintInputChange}
                maxLength={9}
                disabled={mintPending}
                placeholder="0"
              />
            </label>
            <button
              type="submit"
              className="mint-view__mint-button"
              disabled={mintPending || !mintValue || mintValue === '0'}
            >
              Mint
            </button>
          </form>
        ) : null}

        {mintPending ? (
          <div className="mint-view__minting">
            <Spinner label="Minting" />
            <span>minting…</span>
          </div>
        ) : null}

        {mintError && mintStatus !== 'pending' ? (
          <div className="mint-view__error" role="alert">
            {mintError}
          </div>
        ) : null}
      </div>
    </section>
  )
}

const MintView = () => {
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
      <section className="mint-view mint-view--locked">
        <p>Please connect a wallet to proceed!</p>
      </section>
    )
  }

  return <MintViewContent />
}

export default MintView
