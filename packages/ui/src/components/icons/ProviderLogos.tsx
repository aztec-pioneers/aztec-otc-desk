import './ProviderLogos.css'

type ProviderLogoId = 'aztec-native' | 'ledger-shield' | 'browser-bridge'

type ProviderLogoProps = {
  id: ProviderLogoId
}

const ProviderLogos = ({ id }: ProviderLogoProps) => {
  switch (id) {
    case 'aztec-native':
      return (
        <svg className="provider-logo" viewBox="0 0 32 32" aria-hidden focusable="false">
          <defs>
            <linearGradient id="logoAztecGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-gradient-primary-start)" />
              <stop offset="100%" stopColor="var(--color-gradient-primary-end)" />
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="24" height="24" rx="8" fill="url(#logoAztecGradient)" />
          <path
            d="M10.5 11.5h11l-5.5 9.5h5.5L21 22.5H11l5.5-9.5h-5.5Z"
            fill="rgba(10, 13, 22, 0.92)"
          />
        </svg>
      )
    case 'ledger-shield':
      return (
        <svg className="provider-logo" viewBox="0 0 32 32" aria-hidden focusable="false">
          <defs>
            <linearGradient id="logoLedgerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(84, 182, 255, 0.9)" />
              <stop offset="100%" stopColor="rgba(84, 255, 230, 0.65)" />
            </linearGradient>
          </defs>
          <path
            d="M6 7.5 16 4l10 3.5v7.7c0 5.52-4 10.56-10 13.8-6-3.24-10-8.28-10-13.8Z"
            fill="url(#logoLedgerGradient)"
          />
          <path
            d="M16 9.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
            stroke="rgba(8, 10, 17, 0.95)"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      )
    case 'browser-bridge':
    default:
      return (
        <svg className="provider-logo" viewBox="0 0 32 32" aria-hidden focusable="false">
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="rgba(198, 207, 255, 0.15)"
            stroke="rgba(198, 207, 255, 0.45)"
          />
          <path
            d="M10 16h12m-8-4h4m-4 8h4"
            stroke="rgba(198, 207, 255, 0.85)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      )
  }
}

export default ProviderLogos
export type { ProviderLogoId }
