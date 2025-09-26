import {
    Wallet,
    PXE,
    Fr,
    L1FeeJuicePortalManager,
    FeeJuicePaymentMethodWithClaim,
    AccountManager,
    BaseWallet,
    createAztecNodeClient,
} from "@aztec/aztec.js";
import { getDeployedTestAccounts, generateSchnorrAccounts } from "@aztec/accounts/testing";
import { TestWallet } from '@aztec/test-wallet';
import {
    deployEscrowContract,
    deployTokenContract,
    wad,
    depositToEscrow,
    createPXE,
    getFeeJuicePortalManager,
    TOKEN_METADATA,
    fillOTCOrder,
    expectBalancePrivate,
    OTCEscrowContract,
    TokenContract,
    // setupAccountWithFeeClaim
} from "../src";

describe("Private Transfer Demo Test", () => {
    let node = createAztecNodeClient("http://localhost:8080");
    let sellerPXE: PXE;
    let buyerPXE: PXE;


    let minter: { wallet: Wallet, default: AccountManager };
    let seller: { wallet: Wallet, default: AccountManager };
    let buyer: { wallet: Wallet, default: AccountManager };

    let escrowMasterKey: Fr;

    let escrow: OTCEscrowContract;
    let usdc: TokenContract;
    let eth: TokenContract;

    let buyerFeeJuicePortalManager: L1FeeJuicePortalManager;

    const sellTokenAmount = wad(1000n, 6n);
    const buyTokenAmount = wad(1n);
    const sellerUSDCInitialBalance = wad(10000n, 6n);
    const buyerETHInitialBalance = wad(4n);
    
    beforeAll(async () => {
        console.log("trying connect")
        // setup PXE connections
        sellerPXE = await createPXE();
        buyerPXE = await createPXE(1);

        // set up accounts
        const deployedAccounts = await getDeployedTestAccounts(sellerPXE);
        const minterWallet = new TestWallet(sellerPXE, node);
        const minterAccount = await (minterWallet as TestWallet).createSchnorrAccount(
            deployedAccounts[0].secret,
            deployedAccounts[0].salt,
            deployedAccounts[0].signingKey
        );
        minter = { wallet: minterWallet, default: minterAccount };
        const sellerWallet = new TestWallet(sellerPXE, node);
        const sellerAccount = await (sellerWallet as TestWallet).createSchnorrAccount(
            deployedAccounts[1].secret,
            deployedAccounts[1].salt,
            deployedAccounts[1].signingKey
        );
        seller = { wallet: sellerWallet, default: sellerAccount };
        const buyerWallet = new TestWallet(buyerPXE, node);
        const buyerAccount = await (buyerWallet as TestWallet).createSchnorrAccount(
            deployedAccounts[2].secret,
            deployedAccounts[2].salt,
            deployedAccounts[2].signingKey
        );
        buyer = { wallet: buyerWallet, default: buyerAccount };

        // deploy token contract
        usdc = await deployTokenContract(TOKEN_METADATA.usdc, minter.wallet);
        eth = await deployTokenContract(TOKEN_METADATA.eth, minter.wallet);

        // register senders and accounts
        buyer.wallet.registerSender(seller.default.getAddress());
        buyer.wallet.registerSender(minter.default.getAddress());
        // will work for minter as well
        seller.wallet.registerSender(buyer.default.getAddress());
        buyer.wallet.registerContract(usdc);
        buyer.wallet.registerContract(eth);

        // mint tokens
        await eth
            .withWallet(minter.wallet)
            .methods.mint_to_private(
                buyer.default.getAddress(),
                wad(4n, 18n)
            )
            .send({ from: minter.default.getAddress() })
            .wait();

        await usdc
            .withWallet(minter.wallet)
            .methods.mint_to_private(
                seller.default.getAddress(),
                wad(10000n, 6n)
            )
            .send({ from: minter.default.getAddress() })
            .wait();
    });

    test("check escrow key leaking", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerPXE,
            seller.wallet,
            usdc.address,
            buyTokenAmount,
            eth.address,
            sellTokenAmount,
        ));

        // Check seller Escrow
        const sellerDefinition = await escrow
            .withWallet(seller.wallet)
            .methods.get_definition()
            .simulate({ from: seller.default.getAddress() });
        // expect(sellerDefinition.owner).toEqual(escrow.address.toBigInt());
        expect(sellerDefinition.owner).not.toEqual(0n);

        // register contract but do not register decryption keys
        // if contract is not registered they definitely can't call it
        await buyerPXE.registerContract(escrow);

        // check if maker note exists
        expect(async () => {
            await escrow
                .withWallet(buyer.wallet)
                .methods.get_definition()
                .simulate({ from: buyer.default.getAddress() });
        }).toThrow()

        // add account to buyer pxe
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await escrow
            .withWallet(buyer.wallet)
            .methods
            .sync_private_state()
            .simulate({ from: buyer.default.getAddress() });
        const buyerDefinition = await escrow
            .withWallet(buyer.wallet)
            .methods
            .get_definition()
            .simulate({ from: buyer.default.getAddress() });
        expect(buyerDefinition.owner).not.toEqual(0n);
    });

    test("e2e", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerPXE,
            seller.wallet,
            usdc.address,
            sellTokenAmount,
            eth.address,
            buyTokenAmount,
        ));

        // check balances before
        expect(expectBalancePrivate(
            usdc,
            seller.wallet,
            seller.default.getAddress(),
            sellerUSDCInitialBalance
        )).toBeTruthy();
        expect(expectBalancePrivate(
            usdc,
            seller.wallet,
            escrow.address,
            0n
        )).toBeTruthy();

        // deposit tokens into the escrow
        await depositToEscrow(
            escrow,
            seller.wallet,
            usdc,
            sellTokenAmount,
        );

        // check USDC balances after transfer in
        expect(expectBalancePrivate(
            usdc,
            seller.wallet,
            seller.default.getAddress(),
            sellerUSDCInitialBalance - sellTokenAmount
        )).toBeTruthy();
        expect(expectBalancePrivate(
            usdc,
            seller.wallet,
            escrow.address,
            sellTokenAmount
        )).toBeTruthy();

        // check buyer balance balances before filling order
        expect(expectBalancePrivate(
            eth,
            buyer.wallet,
            buyer.default.getAddress(),
            buyerETHInitialBalance
        )).toBeTruthy();
        expect(expectBalancePrivate(
            usdc,
            buyer.wallet,
            buyer.default.getAddress(),
            0n
        )).toBeTruthy();
        expect(expectBalancePrivate(
            eth,
            seller.wallet,
            seller.default.getAddress(),
            0n
        )).toBeTruthy();

        // give buyer knowledge of the escrow
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await buyerPXE.registerContract(escrow);
        await escrow
            .withWallet(buyer.wallet)
            .methods
            .sync_private_state()
            .simulate({ from: buyer.default.getAddress() });

        // transfer tokens back out
        await fillOTCOrder(escrow, buyer.wallet, eth, buyTokenAmount);

        // check balances after filling order
        expect(expectBalancePrivate(
            eth,
            buyer.wallet,
            buyer.default.getAddress(),
            buyerETHInitialBalance - buyTokenAmount
        )).toBeTruthy();
        expect(expectBalancePrivate(
            usdc,
            buyer.wallet,
            buyer.default.getAddress(),
            sellTokenAmount
        )).toBeTruthy();
        expect(expectBalancePrivate(
            eth,
            seller.wallet,
            seller.default.getAddress(),
            buyTokenAmount
        )).toBeTruthy();
        expect(expectBalancePrivate(
            usdc,
            buyer.wallet,
            escrow.address,
            0n
        )).toBeTruthy();
    });
});
