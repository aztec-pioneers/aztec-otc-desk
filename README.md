# Aztec OTC Desk

A private over-the-counter (OTC) trading platform built on the Aztec protocol, designed to facilitate confidential and secure asset swaps between parties using zero-knowledge proofs. The platform enables private and secure peer-to-peer token swaps through smart contract escrows while ensuring transaction confidentiality and security.

## 🏗️ Architecture Overview

The Aztec OTC Desk is a monorepo containing three main packages that work together to provide a complete private OTC trading solution:

- **📄 Contracts**: Aztec Noir smart contracts implementing core OTC Desk functionality with private trading capabilities
- **🖥️ CLI Demo**: Node.js/Bun-based command-line interface demonstrating the complete workflow from order creation to fulfillment
- **🌐 Orderflow Service**: RESTful HTTP service for order management, discovery, and coordination between traders

## 📦 Packages

### 1. 📄 Contracts (`packages/contracts`)

Aztec Noir smart contracts implementing the core OTC escrow functionality.

**Key Features:**
- **OTC Escrow Contract**: Secure escrow mechanism for token swaps
- **Token Contract**: Standard token implementation for testing
- **Private Transfers**: Leverages Aztec's privacy features
- **Atomic Swaps**: Ensures both parties receive their tokens or the trade fails

**Smart Contracts:**
- `OTCEscrowContract`: Main escrow contract that holds seller's tokens until buyer fulfills the order
- `Token`: Standard token contract compatible with Aztec's privacy features

**Usage:**
```bash
cd packages/contracts

# Install dependencies and build
bun install
bun run build

# Run tests (requires sandbox)
# Terminal 1: Start Aztec sandbox
bun run sandbox

# Terminal 2: Start secondary PXE
bun run pxe:local:1

# Terminal 3: Run tests
bun test
```

### 2. 🖥️ CLI Demo (`packages/nodejs-demo`)

A command-line interface demonstrating the complete OTC trading workflow with two parties: a seller and a buyer.

**Demo Scenario:**
- **Seller** (Wallet #0): Wants to sell 1 WETH for 5000 USDC
- **Buyer** (Wallet #1): Wants to buy 1 WETH for 5000 USDC

**Available Commands:**
- `bun run setup:deploy`: Deploy token contracts and mint initial balances
- `bun run setup:mint`: Mint additional tokens to participants
- `bun run setup:accounts`: Setup and configure trading accounts
- `bun run order:create`: Create a new OTC escrow order (seller)
- `bun run order:fill`: Fill an existing OTC escrow order (buyer)
- `bun run balances`: Check token balances of all participants

**Complete Workflow:**

**⚠️ Prerequisites: Build contracts and make sure the orderflow service is running in the background!**

```bash
# Build contracts first (REQUIRED)
cd packages/contracts
bun install
bun run build

# Start orderflow service (in a separate terminal)
cd packages/orderflow-service
bun install && bun run start
```

```bash
cd packages/nodejs-demo

# 1. Setup environment (run once per sandbox session)
bun install
bun run setup:deploy
bun run setup:mint     # Mint tokens to trading accounts
bun run balances       # Check balances after minting

# 2. Create an OTC order (seller perspective)
bun run order:create

# 3. Fill the order (buyer perspective)
bun run order:fill

# 4. Check final balances
bun run balances
```

### 3. 🌐 Orderflow Service (`packages/orderflow-service`)

A RESTful HTTP service that provides order management and discovery capabilities, facilitating the creation, retrieval, and management of private OTC orders.

**Key Features:**
- **Order Management**: Create, update, and manage private OTC orders with unique escrow addresses
- **Order Discovery**: Query, filter, and search for existing orders by various parameters
- **Private Order Coordination**: Facilitate secure communication between trading parties
- **SQLite Database**: Persistent storage with pluggable architecture for scalability
- **RESTful API**: Standard HTTP endpoints for seamless integration

**API Endpoints:**

#### Create Order
```bash
POST /order
Content-Type: application/json

{
  "escrowAddress": "0x1234...",
  "sellTokenAddress": "0x5678...",
  "sellTokenAmount": "1000000000000000000",
  "buyTokenAddress": "0x9abc...",
  "buyTokenAmount": "2000000000000000000"
}
```

#### Get Orders
```bash
# Get all orders
GET /order

# Get specific order by ID
GET /order?id=uuid-here

# Filter by escrow address
GET /order?escrow_address=0x1234...

# Filter by token addresses
GET /order?sell_token_address=0x5678...
GET /order?buy_token_address=0x9abc...
```

**Usage:**
```bash
cd packages/orderflow-service

# Install and start
bun install
bun run start  # Production mode
bun run dev    # Development mode with hot reload

# Run tests
bun test                 # All tests
bun run test:db          # Database tests only
bun run test:handlers    # API handler tests only
bun run test:integration # Integration tests only
```

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.1.22+)
- [Aztec CLI](https://docs.aztec.network/guides/developer_guides/getting_started/quickstart) for sandbox and PXE

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd aztec-otc-desk

# Install dependencies for all packages
bun install

# Install dependencies for each package individually
cd packages/contracts && bun install && cd ../..
cd packages/nodejs-demo && bun install && cd ../..
cd packages/orderflow-service && bun install && cd ../..
```

### Development Setup

**⚠️ Important: You MUST run the orderflow service for the demo to work properly!**

#### Step-by-Step Setup (4 Terminals Required)

**⚠️ Prerequisites: Build contracts first!**
```bash
cd packages/contracts
bun install
bun run build      # REQUIRED: Build contracts before starting services
```

1. **Terminal 1 - Start Aztec Sandbox:**
```bash
cd packages/contracts
bun run sandbox    # Start Aztec sandbox
```

2. **Terminal 2 - Start Secondary PXE** (wait for sandbox to be ready):
```bash
cd packages/contracts
bun run pxe:local:1      # Start buyer's PXE
```
*Wait for message like "Cannot enqueue vote cast signal 0 for address zero at slot 8" indicating sandbox is ready*

3. **Terminal 3 - Start Orderflow Service** ⭐ **REQUIRED**:
```bash
cd packages/orderflow-service
bun install
bun run start      # Starts on http://localhost:3000
```

4. **Terminal 4 - Deploy Contracts & Run Demo:**
```bash
cd packages/nodejs-demo
bun install
bun run setup:deploy    # Deploy token contracts
bun run setup:mint      # Mint tokens to trading accounts ⭐ REQUIRED
bun run balances        # Check balances after minting
bun run order:create    # Create OTC order (seller)
bun run order:fill      # Fill OTC order (buyer)
bun run balances        # Check final balances
```

## 🔧 Development

### Building Contracts

```bash
cd packages/contracts
bun run build
```

### Running Tests

```bash
# Contract tests (requires running sandbox)
cd packages/contracts
bun test

# Orderflow service tests
cd packages/orderflow-service
bun test

# All tests can be run independently
```

### Project Structure

```
aztec-otc-desk/
├── packages/
│   ├── contracts/           # Aztec Noir smart contracts
│   │   ├── src/
│   │   │   ├── main.nr     # OTC Escrow Contract
│   │   │   └── types/      # Custom types and notes
│   │   ├── artifacts/      # Compiled contract artifacts
│   │   └── ts/             # TypeScript bindings
│   ├── nodejs-demo/         # CLI demonstration
│   │   ├── scripts/        # Demo scripts
│   │   └── data/           # Test data and deployments
│   └── orderflow-service/   # HTTP orderflow service
│       ├── src/            # API implementation
│       └── tests/          # Comprehensive test suite
├── deps/
│   └── aztec-standards/    # Aztec standard contracts
└── scripts/                # Root-level utility scripts
```

## 🔐 Privacy Features

This OTC desk leverages Aztec's advanced privacy features to ensure confidential trading:

- **Private Balances**: Token balances remain completely private and hidden from public view
- **Confidential Transfers**: Transfer amounts, recipients, and transaction details are kept confidential
- **Selective Disclosure**: Traders maintain full control over what information to reveal and when
- **Zero-Knowledge Proofs**: All operations are cryptographically verified without revealing sensitive trading data
- **Trustless Escrow**: Atomic swaps provide secure, trustless asset exchanges without intermediaries
- **Private Order Books**: Order details remain confidential until parties choose to execute trades

## 🛠️ Technology Stack

- **Smart Contracts**: Aztec Noir
- **Runtime**: Bun
- **Orderflow Service**: Native Bun HTTP server
- **Database**: SQLite (with pluggable architecture)
- **Testing**: Jest with Bun test runner
- **TypeScript**: Full type safety across all packages

## 📚 Usage Examples

### Creating an OTC Order

```typescript
// 1. Deploy escrow contract with trade parameters
const escrow = await OTCEscrowContract.deploy(
  sellTokenAddress,
  sellTokenAmount,
  buyTokenAddress,
  buyTokenAmount
).send().wait();

// 2. Transfer sell tokens to escrow
await sellToken.methods.transfer(escrowAddress, sellTokenAmount).send().wait();

// 3. Register order with orderflow service
const response = await fetch('http://localhost:3000/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    escrowAddress: escrow.address,
    sellTokenAddress,
    sellTokenAmount: sellTokenAmount.toString(),
    buyTokenAddress,
    buyTokenAmount: buyTokenAmount.toString()
  })
});
```

### Filling an OTC Order

```typescript
// 1. Query available orders
const orders = await fetch('http://localhost:3000/order').then(r => r.json());

// 2. Connect to escrow contract
const escrow = await OTCEscrowContract.at(orders.data[0].escrowAddress);

// 3. Execute the trade
await escrow.methods.fill_order().send().wait();
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Private OTC Desk on Aztec - Project Documentation](https://www.notion.so/aztecnetwork/Private-OTC-Desk-on-Aztec-271a1f6b0e3580088ea5d6d06cbaa2d1?source=copy_link)
- [Aztec Network](https://aztec.network)
- [Aztec Documentation](https://docs.aztec.network)
- [Bun Runtime](https://bun.sh)

---

Built with ❤️ on Aztec Network for private, secure OTC trading.