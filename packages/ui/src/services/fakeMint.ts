const delay = (min = 500, max = 1600) =>
  new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min))

export type MintResult = {
  success: boolean
  message: string
}

export const executeMint = async (symbol: string, amount: number): Promise<MintResult> => {
  await delay()

  const failChance = Math.random()
  if (failChance < 0.2) {
    return {
      success: false,
      message: `Mint failed for ${symbol}: network congestion detected`,
    }
  }

  return {
    success: true,
    message: `Successfully minted ${amount} ${symbol}`,
  }
}
