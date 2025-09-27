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
    address: "0x2867f32eb41fca8cdd8d7021714397dd6fde07c49d125492e876957e74c3998a",
    palette: {
      background: 'linear-gradient(135deg, #6274ff 0%, #54ffe6 100%)',
      foreground: 'rgba(15, 17, 25, 0.92)',
    },
  },
  {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    address: "0x1b622e0d708f452c0407007cca4f4ec21354b3cff102de295a14488aa8d5c692",
    palette: {
      background: 'linear-gradient(135deg, #3671ff 0%, #8fb5ff 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Aztec',
    symbol: 'AZT',
    decimals: 18,
    address: "0x24a3475b9517f194bf71d3eb681c415b61b43361905a0402f133f5d55124dbf0",
    palette: {
      background: 'linear-gradient(135deg, #8d4bff 0%, #ff80d0 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Wrapped ZCash',
    symbol: 'wZEC',
    decimals: 6,
    address: "0x1a9aa76ac9f7d629ce48a8d55fee7d0c78b6feb0b2ed5a1ccbbd0faeb19ff23d",
    palette: {
      background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
      foreground: '#ffffff',
    },
  },
  {
    name: 'Chainlink',
    symbol: 'LINK',
    decimals: 18,
    address: "0x18399a2f2b304e92f2b4c45f62f4f9cc136e91329404d965c101289771b8de0f",
    palette: {
      background: 'linear-gradient(135deg, #ff9a44 0%, #ff4c6a 100%)',
      foreground: '#1a192b',
    },
  },
]

export const DEFAULT_TOKEN_SYMBOL = 'ETH'
