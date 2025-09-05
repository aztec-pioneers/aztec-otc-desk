import {
    AccountWallet,
    PXE,
    Fr,
    L1FeeJuicePortalManager,
    FeeJuicePaymentMethodWithClaim,
} from "@aztec/aztec.js";
import { getInitialTestAccountsManagers, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import {
    deployEscrowContract,
    deployTokenContractWithMinter,
    wad,
    depositToEscrow,
    createPXE,
    getFeeJuicePortalManager,
    TOKEN_METADATA,
    fillOTCOrder,
    expectBalancePrivate,
    OTCEscrowContract,
    TokenContract,
    setupAccountWithFeeClaim
} from "../src";

describe("Private Transfer Demo Test", () => {
    let sellerPXE: PXE;
    let buyerPXE: PXE;

    let minter: AccountWallet;
    let seller: AccountWallet;
    let buyer: AccountWallet;

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

        // get PXE 1 accounts
        const wallets = await Promise.all(
            (await getInitialTestAccountsManagers(sellerPXE)).map(m => m.register())
        );
        minter = wallets[0];
        seller = wallets[1];

        // deploy PXE2 account
        // NOTE: must allow two transactions to pass before claiming
        buyerFeeJuicePortalManager = await getFeeJuicePortalManager(buyerPXE);
        const {
            claim: buyerClaim,
            wallet: buyerWallet,
            account: buyerAccount
        } = await setupAccountWithFeeClaim(buyerPXE, buyerFeeJuicePortalManager);
        buyer = buyerWallet;
        // deploy token contract
        usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, minter);
        eth = await deployTokenContractWithMinter(TOKEN_METADATA.eth, minter);

        // claim fee juice for buyer and deploy
        const claimAndPay = new FeeJuicePaymentMethodWithClaim(buyer, buyerClaim);
        await buyerAccount.deploy({ fee: { paymentMethod: claimAndPay } }).wait();

        // register accounts and contracts in each PXE
        await sellerPXE.registerSender(buyer.getAddress());
        await buyerPXE.registerSender(minter.getAddress());
        await buyerPXE.registerSender(seller.getAddress());
        await buyerPXE.registerContract(usdc);
        await buyerPXE.registerContract(eth);

        // mint tokens
        await eth
            .withWallet(minter)
            .methods.mint_to_private(
                minter.getAddress(),
                buyer.getAddress(),
                wad(4n, 18n)
            )
            .send()
            .wait();

        await usdc
            .withWallet(minter)
            .methods.mint_to_private(
                minter.getAddress(),
                seller.getAddress(),
                wad(10000n, 6n)
            )
            .send()
            .wait();
    });

    test("check escrow key leaking", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerPXE,
            seller,
            usdc.address,
            buyTokenAmount,
            eth.address,
            sellTokenAmount,
        ));

        // Check seller Escrow
        const sellerDefinition = await escrow
            .withWallet(seller)
            .methods.get_definition()
            .simulate();
        // expect(sellerDefinition.owner).toEqual(escrow.address.toBigInt());
        expect(sellerDefinition.owner).not.toEqual(0n);

        // register contract but do not register decryption keys
        // if contract is not registered they definitely can't call it
        await buyerPXE.registerContract(escrow);

        // check if maker note exists
        expect(async () => {
            await escrow
                .withWallet(buyer)
                .methods.get_definition()
                .simulate();
        }).toThrow()

        // add account to buyer pxe
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await escrow.withWallet(buyer).methods.sync_private_state().simulate();
        const buyerDefinition = await escrow
            .withWallet(buyer)
            .methods
            .get_definition()
            .simulate();
        // expect(buyerDefinition.owner).toEqual(escrow.address.toBigInt());
        expect(buyerDefinition.owner).not.toEqual(0n);
    });

    test("e2e", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerPXE,
            seller,
            usdc.address,
            sellTokenAmount,
            eth.address,
            buyTokenAmount,
        ));

        // check balances before
        usdc = usdc.withWallet(seller);
        expect(expectBalancePrivate(usdc, seller.getAddress(), sellerUSDCInitialBalance)).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, 0n)).toBeTruthy();

        // deposit tokens into the escrow
        await depositToEscrow(
            escrow,
            seller,
            usdc,
            sellTokenAmount,
        );

        // check USDC balances after transfer in
        usdc = usdc.withWallet(seller);
        expect(
            expectBalancePrivate(usdc, seller.getAddress(), sellerUSDCInitialBalance - sellTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, sellTokenAmount)).toBeTruthy();


        // check buyer balance balances before filling order
        usdc = usdc.withWallet(buyer);
        eth = eth.withWallet(buyer);
        expect(expectBalancePrivate(eth, seller.getAddress(), buyerETHInitialBalance)).toBeTruthy();
        expect(expectBalancePrivate(usdc, seller.getAddress(), 0n)).toBeTruthy();
        expect(expectBalancePrivate(eth, escrow.address, 0n)).toBeTruthy();

        // give buyer knowledge of the escrow
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await buyerPXE.registerContract(escrow);
        await escrow.withWallet(buyer).methods.sync_private_state().simulate();

        // transfer tokens back out
        await fillOTCOrder(escrow, buyer, eth, buyTokenAmount);

        // check balances after filling order
        expect(
            expectBalancePrivate(eth, buyer.getAddress(), buyerETHInitialBalance - buyTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(usdc, buyer.getAddress(), sellTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(eth, seller.getAddress(), buyTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, 0n)).toBeTruthy();
    });
});
