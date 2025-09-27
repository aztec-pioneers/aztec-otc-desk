import { TOKENS, type TokenMetadata } from '../data/tokens'

const FRACTION_DIGITS = 6

const getToken = (symbol: string): TokenMetadata => {
  const token = TOKENS.find((entry) => entry.symbol === symbol)
  if (!token) {
    throw new Error(`Unknown token symbol ${symbol}`)
  }
  return token
}

export const toBaseUnits = (symbol: string, amount: number): bigint => {
  const { decimals } = getToken(symbol)
  const multiplier = BigInt(10) ** BigInt(decimals)
  return BigInt(amount) * multiplier
}

export const formatBaseUnits = (symbol: string, amount: bigint): string => {
  const { decimals } = getToken(symbol)
  const multiplier = BigInt(10) ** BigInt(decimals)
  const whole = amount / multiplier
  const fraction = amount % multiplier

  const baseFraction = (() => {
    if (decimals === 0) {
      return '0'.repeat(FRACTION_DIGITS)
    }
    const padded = fraction.toString().padStart(decimals, '0')
    if (decimals >= FRACTION_DIGITS) {
      return padded.slice(0, FRACTION_DIGITS)
    }
    return (padded + '0'.repeat(FRACTION_DIGITS - decimals)).slice(0, FRACTION_DIGITS)
  })()

  return `${whole.toString()}.${baseFraction}`
}
