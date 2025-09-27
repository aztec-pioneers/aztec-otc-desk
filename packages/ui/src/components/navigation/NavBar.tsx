import { NavLink, useNavigate } from 'react-router-dom'
import useWallet from '../../hooks/useWallet'
import useModalState from '../../hooks/useModalState'
import useIsMobile from '../../hooks/useIsMobile'
import WalletModal from '../wallet/WalletModal'
import './NavBar.css'

const NavBar = () => {
  const navigate = useNavigate()
  const { status, activeAccount } = useWallet()
  const walletModal = useModalState(false)
  const isMobile = useIsMobile()

  const handleWalletClick = () => {
    walletModal.show()
  }

  const shortAddress = (address?: string) =>
    address ? `${address.slice(0, 6)}…${address.slice(-4)}` : undefined

  const walletLabel = (() => {
    if (status === 'connecting') {
      return 'Connecting…'
    }

    if (status === 'connected') {
      const baseLabel = activeAccount?.label ?? 'Connected'
      const addressSuffix = shortAddress(activeAccount?.address)
      return addressSuffix ? `${baseLabel} · ${addressSuffix}` : baseLabel
    }

    return 'Wallet disconnected'
  })()

  return (
    <>
      <header className="nav-bar">
        <div className={`nav-bar__inner${isMobile ? ' nav-bar__inner--mobile' : ''}`}>
          <button type="button" className="nav-bar__brand" onClick={() => navigate('/')}>
            <span className="nav-bar__brand-mark" aria-hidden>
              AZ
            </span>
            <span className="nav-bar__brand-text">Aztec OTC Desk</span>
          </button>

          {!isMobile ? (
            <nav aria-label="Primary">
              <ul className="nav-bar__links">
                <li>
                  <NavLink
                    to="/mint"
                    className={({ isActive }) =>
                      isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
                    }
                  >
                    Mint
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/sell"
                    className={({ isActive }) =>
                      isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
                    }
                  >
                    Sell
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/buy"
                    className={({ isActive }) =>
                      isActive ? 'nav-bar__link nav-bar__link--active' : 'nav-bar__link'
                    }
                  >
                    Buy
                  </NavLink>
                </li>
              </ul>
            </nav>
          ) : null}

          {!isMobile ? (
            <button
              type="button"
              className={`nav-bar__wallet nav-bar__wallet--${status}`}
              onClick={handleWalletClick}
              aria-live="polite"
              aria-label={walletLabel}
            >
              <span className="nav-bar__wallet-indicator" aria-hidden />
              <span>{walletLabel}</span>
            </button>
          ) : null}
        </div>
      </header>
      <WalletModal open={walletModal.open} onClose={walletModal.hide} />
    </>
  )
}

export default NavBar
