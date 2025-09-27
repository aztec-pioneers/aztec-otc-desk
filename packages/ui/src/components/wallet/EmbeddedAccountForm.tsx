import { useState } from 'react'
import { Fr } from '@aztec/aztec.js'
import { deriveSigningKey } from '@aztec/stdlib/keys'
import { randomBytes } from '@aztec/foundation/crypto'
import type { EmbeddedWallet } from '../../wallet/embeddedWallet'
import Spinner from '../primitives/Spinner'
import { AccountTypes, type AccountType } from '../../wallet/walletDB'
import useToast from '../../hooks/useToast'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  schnorr: 'Schnorr (recommended)',
  ecdsasecp256r1: 'ECDSA R1',
  ecdsasecp256k1: 'ECDSA K1',
}

const generateSigningKey = (type: AccountType, secret: Fr) => {
  if (type === 'schnorr') {
    return deriveSigningKey(secret).toBuffer()
  }
  return randomBytes(32)
}

type EmbeddedAccountFormProps = {
  wallet: EmbeddedWallet
  onCreated: (address: string) => Promise<void> | void
}

const EmbeddedAccountForm = ({ wallet, onCreated }: EmbeddedAccountFormProps) => {
  const [alias, setAlias] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('schnorr')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { pushToast } = useToast()

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!alias.trim()) {
      setError('Alias is required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const secretKey = Fr.random()
      const salt = Fr.random()
      const signingKey = generateSigningKey(accountType, secretKey)
      const accountManager = await wallet.createAndStoreAccount(
        alias.trim(),
        accountType,
        secretKey,
        salt,
        signingKey,
      )
      const account = await accountManager.getAccount()
      const address = account.getAddress().toString()
      pushToast({ message: `Account ${alias.trim()} created`, variant: 'success' })
      await onCreated(address)
      setAlias('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account'
      setError(message)
      pushToast({ message, variant: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="embedded-account-form" onSubmit={handleSubmit}>
      <div className="embedded-account-form__fields">
        <label>
          <span>Alias</span>
          <input
            type="text"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Treasury"
            disabled={isSubmitting}
            maxLength={32}
          />
        </label>

        <label>
          <span>Account type</span>
          <select
            value={accountType}
            onChange={(event) => setAccountType(event.target.value as AccountType)}
            disabled={isSubmitting}
          >
            {AccountTypes.map((type) => (
              <option key={type} value={type}>
                {ACCOUNT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" disabled={isSubmitting} className="embedded-account-form__submit">
        {isSubmitting ? (
          <span className="embedded-account-form__pending">
            <Spinner size="sm" label="Creating account" />
            <span>Creating…</span>
          </span>
        ) : (
          'Create account'
        )}
      </button>

      {error ? (
        <div className="embedded-account-form__error" role="alert">
          {error}
        </div>
      ) : null}
    </form>
  )
}

export default EmbeddedAccountForm
