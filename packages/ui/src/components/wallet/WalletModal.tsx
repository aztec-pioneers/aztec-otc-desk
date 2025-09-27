import { useEffect, useMemo, useState } from 'react'
import Modal from '../primitives/Modal'
import Button from '../primitives/Button'
import Spinner from '../primitives/Spinner'
import ProviderLogos from '../icons/ProviderLogos'
import useWallet from '../../hooks/useWallet'
import useToast from '../../hooks/useToast'
import EmbeddedAccountForm from './EmbeddedAccountForm'
import './WalletModal.css'

const PROVIDER_DESCRIPTIONS = {
  embedded: {
    name: 'Aztec Native Wallet',
    description: 'Full PXE-powered wallet running inside the application sandbox.',
  },
  extension: {
    name: 'Extension Wallet',
    description: 'Connect to a browser extension wallet (coming soon).',
  },
} as const

const WalletModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const {
    status,
    providerType,
    accounts,
    activeAccount,
    wallet,
    connect,
    disconnect,
    setActiveAccount,
    refreshAccounts,
  } = useWallet()
  const { pushToast } = useToast()

  const [pendingProvider, setPendingProvider] = useState<'embedded' | 'extension' | null>(null)
  const [showCreateAccount, setShowCreateAccount] = useState(false)

  useEffect(() => {
    if (!open) {
      setPendingProvider(null)
      setShowCreateAccount(false)
    }
  }, [open])

  const modalMeta = useMemo(() => {
    if (status === 'connecting') {
      return {
        title: 'Connecting wallet…',
        description: 'Authorising PXE and syncing account data. This may take a moment.',
      }
    }

    if (status === 'connected') {
      const providerName = providerType ? PROVIDER_DESCRIPTIONS[providerType].name : 'Wallet'
      return {
        title: `${providerName} connected`,
        description: 'Manage accounts, switch active session, or disconnect below.',
      }
    }

    return {
      title: 'Connect a wallet',
      description: 'Choose a provider to begin a private Aztec session.',
    }
  }, [status, providerType])

  const handleConnect = async (provider: 'embedded' | 'extension') => {
    if (status === 'connecting') {
      return
    }
    setPendingProvider(provider)
    try {
      await connect(provider)
      pushToast({
        message: `${PROVIDER_DESCRIPTIONS[provider].name} connected`,
        variant: 'success',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unable to connect ${PROVIDER_DESCRIPTIONS[provider].name}`
      pushToast({ message, variant: 'error' })
    } finally {
      setPendingProvider(null)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    pushToast({ message: 'Wallet disconnected', variant: 'success' })
    onClose()
  }

  const handleAccountCreated = async (address: string) => {
    const refreshed = await refreshAccounts()
    const created = refreshed.find((account) => account.address === address)
    if (created) {
      setActiveAccount(created.address)
    }
    setShowCreateAccount(false)
  }

  const isEmbedded = providerType === 'embedded' && wallet?.type === 'embedded'
  const isConnecting = status === 'connecting'
  const isConnected = status === 'connected'

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isConnecting) {
          onClose()
        }
      }}
      title={modalMeta.title}
      description={modalMeta.description}
    >
      {status === 'disconnected' ? (
        <div className="wallet-modal__providers">
          <button
            type="button"
            className="wallet-modal__provider"
            onClick={() => handleConnect('embedded')}
            disabled={isConnecting || pendingProvider === 'embedded'}
          >
            <div className="wallet-modal__provider-main">
              <span className="wallet-modal__provider-logo-wrapper">
                <ProviderLogos id="aztec-native" />
              </span>
              <div className="wallet-modal__provider-content">
                <span className="wallet-modal__provider-name">
                  {PROVIDER_DESCRIPTIONS.embedded.name}
                </span>
                <p className="wallet-modal__provider-description">
                  {PROVIDER_DESCRIPTIONS.embedded.description}
                </p>
              </div>
            </div>
            {pendingProvider === 'embedded' ? (
              <span className="wallet-modal__provider-loading">Connecting…</span>
            ) : null}
          </button>

          <button
            type="button"
            className="wallet-modal__provider wallet-modal__provider--disabled"
            onClick={() =>
              pushToast({ message: 'Extension wallet not available yet', variant: 'error' })
            }
            disabled
          >
            <div className="wallet-modal__provider-main">
              <span className="wallet-modal__provider-logo-wrapper">
                <ProviderLogos id="browser-bridge" />
              </span>
              <div className="wallet-modal__provider-content">
                <div className="wallet-modal__provider-headline">
                  <span className="wallet-modal__provider-name">
                    {PROVIDER_DESCRIPTIONS.extension.name}
                  </span>
                  <span className="wallet-modal__provider-pill">Soon</span>
                </div>
                <p className="wallet-modal__provider-description">
                  {PROVIDER_DESCRIPTIONS.extension.description}
                </p>
              </div>
            </div>
          </button>
        </div>
      ) : null}

      {isConnecting ? (
        <div className="wallet-modal__connecting">
          <Spinner label="Connecting" />
          <span>Authorising wallet…</span>
        </div>
      ) : null}

      {isConnected ? (
        <div className="wallet-modal__connected">
          <div className="wallet-modal__status-chip">
            {PROVIDER_DESCRIPTIONS[providerType ?? 'embedded'].name}
          </div>

          <div className="wallet-modal__accounts">
            <span className="wallet-modal__section-title">Accounts</span>
            {accounts.length === 0 ? (
              <p className="wallet-modal__empty">No accounts yet</p>
            ) : (
              <ul className="wallet-modal__account-list">
                {accounts.map((account) => {
                  const isActive = account.address === activeAccount?.address
                  return (
                    <li key={account.address}>
                      <button
                        type="button"
                        className={
                          isActive
                            ? 'wallet-modal__account-button wallet-modal__account-button--active'
                            : 'wallet-modal__account-button'
                        }
                        onClick={() => setActiveAccount(account.address)}
                      >
                        <span>{account.label}</span>
                        <span className="wallet-modal__account-address">
                          {account.address.slice(0, 6)}…{account.address.slice(-4)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {activeAccount ? (
            <div className="wallet-modal__details">
              <div>
                <span className="wallet-modal__section-title">Active address</span>
                <div className="wallet-modal__address">{activeAccount.address}</div>
              </div>
            </div>
          ) : null}

          {isEmbedded && wallet?.type === 'embedded' ? (
            <div className="wallet-modal__embedded">
              <div className="wallet-modal__embedded-header">
                <span className="wallet-modal__section-title">Embedded wallet</span>
                <button
                  type="button"
                  className="wallet-modal__embedded-toggle"
                  onClick={() => setShowCreateAccount((prev) => !prev)}
                >
                  {showCreateAccount ? 'Cancel' : 'Create new account'}
                </button>
              </div>
              {showCreateAccount ? (
                <EmbeddedAccountForm wallet={wallet.instance} onCreated={handleAccountCreated} />
              ) : null}
            </div>
          ) : null}

          <div className="wallet-modal__connected-actions">
            <Button variant="secondary" block onClick={() => refreshAccounts()}>
              Refresh accounts
            </Button>
            <Button variant="ghost" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export default WalletModal
