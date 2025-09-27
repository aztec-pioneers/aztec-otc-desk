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

export const normaliseDecimalInput = (raw: string): string => {
  const cleaned = raw.replace(/[^0-9.]/g, '')
  if (!cleaned) {
    return ''
  }

  const firstDot = cleaned.indexOf('.')
  if (firstDot === -1) {
    return cleaned
  }

  const headRaw = cleaned.slice(0, firstDot)
  const tailRaw = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, '')

  const head = headRaw.length > 0 ? headRaw : '0'
  const safeTail = tailRaw.slice(0, FRACTION_DIGITS)

  return safeTail.length > 0 ? `${head}.${safeTail}` : `${head}.`
}

export const parseDecimalAmount = (symbol: string, value: string): bigint => {
  const token = getToken(symbol)
  const [rawWhole, fractionalPart = ''] = value.split('.')
  const wholePart = rawWhole === '' ? '0' : rawWhole

  if (!/^[0-9]+$/.test(wholePart) || (fractionalPart && !/^[0-9]+$/.test(fractionalPart))) {
    throw new Error('Enter a valid amount')
  }
  if (fractionalPart.length > FRACTION_DIGITS) {
    throw new Error('Too many decimal places')
  }

  const multiplier = BigInt(10) ** BigInt(token.decimals)
  const whole = BigInt(wholePart || '0') * multiplier
  const paddedFraction = fractionalPart.padEnd(token.decimals, '0').slice(0, token.decimals) || '0'
  const fraction = BigInt(paddedFraction)

  return whole + fraction
}

export const clampDecimalInput = (
  symbol: string,
  raw: string,
  available?: bigint,
): { display: string; base?: bigint; error: string | null } => {
  const display = normaliseDecimalInput(raw)
  if (!display) {
    return { display: '', base: undefined, error: null }
  }

  try {
    const base = parseDecimalAmount(symbol, display)
    if (base === BigInt(0)) {
      return { display, base, error: 'Amount must be greater than zero' }
    }
    if (available !== undefined && base > available) {
      return {
        display: formatBaseUnits(symbol, available),
        base: available,
        error: null,
      }
    }
    return { display, base, error: null }
  } catch (error) {
    return {
      display,
      base: undefined,
      error: error instanceof Error ? error.message : 'Enter a valid amount',
    }
  }
}
