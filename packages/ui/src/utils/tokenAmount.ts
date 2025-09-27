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

  if (fraction === BigInt(0)) {
    return whole.toString()
  }

  const fractionStr = fraction
    .toString()
    .padStart(decimals, '0')
    .slice(0, FRACTION_DIGITS)
    .replace(/0+$/, '')

  return fractionStr ? `${whole.toString()}.${fractionStr}` : whole.toString()
}
