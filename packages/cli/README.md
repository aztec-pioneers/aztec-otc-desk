# nodejs-demo

A nodejs based ( bun actually XD ) demo, where we have two parties:
- Seller: Wants to sell 1 Eth OTC for 5000 USDC
- Buyer: Wants to buy 1 Eth OTC for 5000 USDC

Seller is the wallet indexed 0 of default wallets that ship with the PXE, while Buyer is the wallet indexed 1 of the default wallets that ship with the PXE.


# Steps to run:

## SETUP
1. in `../contracts` IN TERMINAL 1 run `bun run build`
2. in `../contracts` IN TERMINAL 2 run `aztec start --sandbox` (todo: merge feat/nr-tests so we use `bun run sandbox`) to start sandbox & primary (seller) PXE
3. in `../contracts` IN TERMINAL 3 run `bun run pxe:1` ONCE SANDBOX IN TERMINAL 2 IS SETUP  to start secondary (buyer) PXE connected to sandbox
    - will say something like "Cannot enqueue vote cast signal 0 for address zero at slot 8" when sandbox ready
4. in `../orderflow-service` IN TERMINAL 4 run `bun run start` to start orderflow API locally

## USE
1. Deploy new token contracts and mint tokens to particpants with `bun run deploy`
    - This only needs to be run once per new sandbox instantiation
    - This is a rigid test case and only mints enough for 10 buy/sell orders - will fail with balance check if you try to use it more
2. Create a new OTC escrow order with `bun run order:create`
    - Rigid test case that sells 1 WETH for 5000 USDC always
    - Will deploy a new OTCEscrowContract with parameters set onchain
    - Will transfer sell tokens into the escrow pending order fill
    - Will notify orderflow API with everything needed to connect and fill the private order
    - always uses Test Wallet #0 as seller on PXE 1
3. Fill an existing OTC escrow with `bun run order:fill`
    - Rigid test case, API returns all orders and will choose the first off the top
    - Will connect escrow contract & account to PXE to interact
    - Will fill order, transferring sell_tokens from escrow to buyer and buy_tokens from buyer to seller
    - always uses Test Wallet #1 as seller on PXE 2
