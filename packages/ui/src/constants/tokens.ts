import { AztecAddress, Fq, Fr } from "@aztec/aztec.js"

export type TokenMetadata = {
  name: string
  symbol: string
  decimals: number
  address: string
  palette: {
    background: string
    foreground: string
  }
}

export const MINTER_ACCOUNT = {
  secret: Fr.fromString("0x2153536ff6628eee01cf4024889ff977a18d9fa61d0e414422f7681cf085c281"),
  signingKey: Fq.fromString("0x01fd93f425865e9aa9a14e9a7b78ca7cb1c4406f8458e511c019d03048b722ea"),
  salt: Fr.fromString("0x0000000000000000000000000000000000000000000000000000000000000000"),
  address: AztecAddress.fromString("0x1099dfa5972b779477140f36b6fcd9ae3ffcb77ea17ccaf5af0d12e3844762af")
}

export const TOKENS: TokenMetadata[] = [
  {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    address: "0x2efce0bce4e3cbe89646d8ff7698f14ebd9468f85cf19d6d9552228abc3a7879",
    palette: {
      background: 'linear-gradient(135deg, #6274ff 0%, #54ffe6 100%)',
      foreground: 'rgba(15, 17, 25, 0.92)',
    },
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: "0x04d0ddc9e801aa0a24a8987e5537b9973e3f255f84ffc6791d6b912215cc6588",
    palette: {
      background: 'linear-gradient(135deg, #3671ff 0%, #8fb5ff 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Aztec',
    symbol: 'AZT',
    decimals: 18,
    address: "0x10277becf1810a1ea0a15861e9f6fb553acc886901c89d2ab66814102439a0bf",
    palette: {
      background: 'linear-gradient(135deg, #8d4bff 0%, #ff80d0 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Wrapped ZCash',
    symbol: 'wZEC',
    decimals: 6,
    address: "0x2ec277147a6895f35ad1a8eebfb8c44754c4477244d38b90be28f36d8bd3117f",
    palette: {
      background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Chainlink',
    symbol: 'LINK',
    decimals: 18,
    address: "0x2a96327dbf0a40f9b75be67d12e0d408e6f1f7be6bbaac1b2f11271bfe67d80b",
    palette: {
      background: 'linear-gradient(135deg, #ff9a44 0%, #ff4c6a 100%)',
      foreground: '#1a192b',
    },
  },
]

export const DEFAULT_TOKEN_SYMBOL = 'ETH'
