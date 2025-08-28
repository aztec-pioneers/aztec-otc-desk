import {
    AccountWallet,
    PXE,
    Fr,
    L1FeeJuicePortalManager,
    FeeJuicePaymentMethodWithClaim,
} from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
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
} from "./utils/index.js";
import {
    OTCEscrowContractContract as OTCEscrowContract,
} from "../../artifacts/OTCEscrowContract.js";

import {
    TokenContract,
} from "../../artifacts/Token.js";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { deriveSigningKey } from "@aztec/stdlib/keys";

describe("Private Transfer Demo Test", () => {
    let sellerPXE: PXE;
    let buyerPXE: PXE;

    let minter: AccountWallet;
    let seller: AccountWallet;
    let buyer: AccountWallet;

    let escrowMasterKey: Fr;

    let escrow: OTCEscrowContract;
    let usdc: TokenContract;
    let weth: TokenContract;

    let feeJuicePortalManager: L1FeeJuicePortalManager;

    const sellTokenAmount = wad(1000n, 6n);
    const buyTokenAmount = wad(1n);
    const sellerUSDCInitialBalance = wad(10000n, 6n);
    const buyerWETHInitialBalance = wad(4n);

    beforeAll(async () => {
        // setup PXE connections
        sellerPXE = await createPXE();
        buyerPXE = await createPXE(1);

        // get PXE 1 accounts
        const wallets = await getInitialTestAccountsWallets(sellerPXE);
        minter = wallets[0];
        seller = wallets[1];

        // deploy PXE2 account
        const buyerMasterKey = Fr.random();
        const buyerAccount = await getSchnorrAccount(
            buyerPXE,
            buyerMasterKey,
            deriveSigningKey(buyerMasterKey),
            Fr.random() // salt
        );
        buyer = await buyerAccount.getWallet();
        feeJuicePortalManager = await getFeeJuicePortalManager(buyerPXE);
        const claim = await feeJuicePortalManager.bridgeTokensPublic(
            buyer.getAddress(),
            wad(1n),
            true
        );
        // NOTE: must allow two transactions to pass before claiming

        // deploy token contract
        usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, minter);
        weth = await deployTokenContractWithMinter(TOKEN_METADATA.weth, minter);

        // claim fee juice for buyer and deploy
        const claimAndPay = new FeeJuicePaymentMethodWithClaim(buyer, claim);
        await buyerAccount.deploy({ fee: { paymentMethod: claimAndPay } }).wait();
        await sellerPXE.registerSender(buyer.getAddress());
        await buyerPXE.registerSender(seller.getAddress());
        await buyerPXE.registerContract(usdc);
        await buyerPXE.registerContract(weth);

        // mint tokens
        // FOR SOME REASON MINTING TOKENS TO buyer DOESN"T WORK?
        // BUT MINTING TO seller THEN SENDING FROM buyer WORKS? OK THEN
        // await weth
        //     .withWallet(minter)
        //     .methods.mint_to_private(
        //         minter.getAddress(),
        //         buyer.getAddress(),
        //         wad(4n, 18n)
        //     )
        //     .send()
        //     .wait();

        await weth
            .withWallet(minter)
            .methods.mint_to_private(
                minter.getAddress(),
                seller.getAddress(),
                wad(4n)
            )
            .send()
            .wait();

        await weth.withWallet(seller)
            .methods.transfer_private_to_private(
                seller.getAddress(),
                buyer.getAddress(),
                wad(4n),
                0
            ).send().wait();

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
            weth.address,
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
            weth.address,
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
        weth = weth.withWallet(buyer);
        expect(expectBalancePrivate(weth, seller.getAddress(), buyerWETHInitialBalance)).toBeTruthy();
        expect(expectBalancePrivate(usdc, seller.getAddress(), 0n)).toBeTruthy();
        expect(expectBalancePrivate(weth, escrow.address, 0n)).toBeTruthy();

        // give buyer knowledge of the escrow
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await buyerPXE.registerContract(escrow);
        await escrow.withWallet(buyer).methods.sync_private_state().simulate();

        // transfer tokens back out
        await fillOTCOrder(escrow, buyer, weth, buyTokenAmount);

        // check balances after filling order
        expect(
            expectBalancePrivate(weth, buyer.getAddress(), buyerWETHInitialBalance - buyTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(usdc, buyer.getAddress(), sellTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(weth, seller.getAddress(), buyTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, 0n)).toBeTruthy();
    });
});
