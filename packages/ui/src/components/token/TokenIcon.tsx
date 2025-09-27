import type { TokenMetadata } from '../../data/tokens'
import './TokenIcon.css'

type TokenIconProps = {
  token: TokenMetadata
  size?: 'sm' | 'md'
}

const CLASS_MAP = {
  sm: 'token-icon--sm',
  md: 'token-icon--md',
} satisfies Record<NonNullable<TokenIconProps['size']>, string>

const TokenIcon = ({ token, size = 'md' }: TokenIconProps) => {
  return (
    <span
      className={`token-icon ${CLASS_MAP[size]}`}
      style={{ background: token.palette.background, color: token.palette.foreground }}
      aria-hidden
    >
      {token.symbol.slice(0, 2)}
    </span>
  )
}

export default TokenIcon
