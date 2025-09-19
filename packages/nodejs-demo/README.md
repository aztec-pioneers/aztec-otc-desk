# CLI Demo

A Bun-based command-line interface demonstrating the complete OTC trading workflow with private and secure asset swaps on Aztec.

## 🎭 Demo Scenario

- **Seller** (Wallet #0): Wants to sell 1 WETH for 5000 USDC
- **Buyer** (Wallet #1): Wants to buy 1 WETH for 5000 USDC

The seller uses the primary PXE (wallet index 0), while the buyer uses the secondary PXE (wallet index 1).

## 🚀 Available Commands

- `bun run setup:deploy`: Deploy token contracts and mint initial balances
- `bun run setup:mint`: Mint additional tokens to participants
- `bun run setup:accounts`: Setup and configure trading accounts
- `bun run order:create`: Create a new OTC escrow order (seller)
- `bun run order:fill`: Fill an existing OTC escrow order (buyer)
- `bun run balances`: Check token balances of all participants

## 📋 Prerequisites

**⚠️ CRITICAL: Contracts must be built and all services must be running before executing the workflow!**

### Build Contracts First
```bash
cd ../contracts
bun install
bun run build     # REQUIRED: Build contracts before starting services
```

### Required Services (4 Terminals)

1. **Terminal 1 - Aztec Sandbox:**
```bash
cd ../contracts
bun run build      # Build contracts first
bun run sandbox    # Start Aztec sandbox
```

2. **Terminal 2 - Secondary PXE** (wait for sandbox to be ready):
```bash
cd ../contracts
bun run pxe:local:1  # Start buyer's PXE
```
*Wait for message like "Cannot enqueue vote cast signal 0 for address zero at slot 8" indicating sandbox is ready*

3. **Terminal 3 - Orderflow Service** ⭐ **REQUIRED**:
```bash
cd ../orderflow-service
bun install
bun run start      # Starts on http://localhost:3000
```

4. **Terminal 4 - Demo Commands** (this package):
```bash
cd packages/nodejs-demo
bun install
# Now run the workflow commands below
```

## 🔄 Complete Workflow

**⚠️ Prerequisites: Make sure the orderflow service is running in the background!**
```bash
# Start orderflow service (in a separate terminal)
cd ../orderflow-service
bun install && bun run start
```

```bash
cd packages/nodejs-demo

# 1. Setup environment (run once per sandbox session)
bun install
bun run setup:deploy
bun run setup:mint     # Mint tokens to trading accounts ⭐ REQUIRED
bun run balances       # Check balances after minting

# 2. Create an OTC order (seller perspective)
bun run order:create

# 3. Fill the order (buyer perspective)
bun run order:fill

# 4. Check final balances
bun run balances
```

## 📝 Command Details

### `bun run setup:deploy`
- Deploys new token contracts (WETH and USDC)
- Only needs to be run once per new sandbox instantiation
- Creates initial token supply and contract deployments

### `bun run setup:mint`
- Mints tokens to trading participants
- **REQUIRED** before creating/filling orders
- Provides enough tokens for ~10 buy/sell orders
- Will fail with balance check if overused
- **Tip**: Run `bun run balances` after minting to verify token distribution

### `bun run order:create`
- **Seller action**: Creates a new OTC escrow order
- Fixed test case: sells 1 WETH for 5000 USDC
- Deploys a new `OTCEscrowContract` with parameters set onchain
- Transfers sell tokens into the escrow pending order fill
- Notifies orderflow API with everything needed to connect and fill the private order
- Always uses Test Wallet #0 as seller on primary PXE

### `bun run order:fill`
- **Buyer action**: Fills an existing OTC escrow order
- Queries orderflow API and selects the first available order
- Connects to escrow contract and executes the trade
- Transfers sell_tokens from escrow to buyer and buy_tokens from buyer to seller
- Always uses Test Wallet #1 as buyer on secondary PXE

### `bun run balances`
- Displays current token balances for all participants
- Useful for verifying successful trades
- Shows both WETH and USDC balances

## 🔐 Privacy Features

This demo showcases Aztec's privacy capabilities:

- **Private Balances**: Token balances remain completely private
- **Confidential Transfers**: Transfer amounts and recipients are kept confidential  
- **Zero-Knowledge Proofs**: All operations are cryptographically verified
- **Trustless Escrow**: Atomic swaps provide secure, trustless asset exchanges
