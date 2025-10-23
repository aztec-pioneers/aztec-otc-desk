import { AccountWallet, PXE, Fr, AztecAddress } from "@aztec/aztec.js";
import { getInitialTestAccountsManagers } from "@aztec/accounts/testing";
import {
    deployEscrowContract,
    deployTokenContractWithMinter,
    wad,
    depositToEscrow,
    createPXE,
    TOKEN_METADATA,
    fillOTCOrder,
    expectBalancePrivate,
    OTCEscrowContract,
    TokenContract,
} from "../src";

describe("Private Transfer Demo Test", () => {
    let sellerPXE: PXE;
    let buyerPXE: PXE;

    let minter: AccountWallet;
    let seller: AccountWallet;
    let buyer: AccountWallet;

    let minterAddress: AztecAddress;
    let sellerAddress: AztecAddress;
    let buyerAddress: AztecAddress;

    let escrowMasterKey: Fr;

    let escrow: OTCEscrowContract;
    let usdc: TokenContract;
    let eth: TokenContract;

    const sellTokenAmount = wad(1000n, 6n);
    const buyTokenAmount = wad(1n);
    const sellerUSDCInitialBalance = wad(10000n, 6n);
    const buyerETHInitialBalance = wad(4n);

    beforeAll(async () => {
        // setup PXE connections
        sellerPXE = await createPXE(1);
        buyerPXE = await createPXE(2);
        console.log("PXEs connected");

        // get PXE 1 accounts
        const walletsPXE1 = await Promise.all(
            (await getInitialTestAccountsManagers(sellerPXE)).map(m => m.register())
        );
        minter = walletsPXE1[0];
        minterAddress = minter.getAddress();
        seller = walletsPXE1[1];
        sellerAddress = seller.getAddress();
        // get PXE 2 account
        const walletsPXE2 = await Promise.all(
            (await getInitialTestAccountsManagers(buyerPXE)).map(m => m.register())
        );
        buyer = walletsPXE2[2];
        buyerAddress = buyer.getAddress();

        
        // deploy token contract
        usdc = await deployTokenContractWithMinter(TOKEN_METADATA.usdc, minter);
        eth = await deployTokenContractWithMinter(TOKEN_METADATA.eth, minter);

        // register accounts and contracts in each PXE
        await seller.registerSender(buyerAddress);
        await buyer.registerSender(minterAddress);
        await buyer.registerSender(sellerAddress);
        await buyer.registerContract(usdc);
        await buyer.registerContract(eth);

        // mint tokens
        await eth
            .withWallet(minter)
            .methods.mint_to_private(
                minterAddress,
                buyerAddress,
                wad(4n, 18n)
            )
            .send({ from: minterAddress })
            .wait();

        await usdc
            .withWallet(minter)
            .methods.mint_to_private(
                minterAddress,
                sellerAddress,
                wad(10000n, 6n)
            )
            .send({ from: minterAddress })
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
            .simulate({ from: sellerAddress });
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
                .simulate({ from: buyerAddress });
        }).toThrow()

        // add account to buyer pxe
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await escrow
            .withWallet(buyer)
            .methods.sync_private_state()
            .simulate({ from: buyerAddress });
        const buyerDefinition = await escrow
            .withWallet(buyer)
            .methods
            .get_definition()
            .simulate({ from: buyerAddress });
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
        expect(expectBalancePrivate(usdc, sellerAddress, sellerUSDCInitialBalance)).toBeTruthy();
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
            expectBalancePrivate(usdc, sellerAddress, sellerUSDCInitialBalance - sellTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, sellTokenAmount)).toBeTruthy();


        // check buyer balance balances before filling order
        usdc = usdc.withWallet(buyer);
        eth = eth.withWallet(buyer);
        expect(expectBalancePrivate(eth, sellerAddress, buyerETHInitialBalance)).toBeTruthy();
        expect(expectBalancePrivate(usdc, sellerAddress, 0n)).toBeTruthy();
        expect(expectBalancePrivate(eth, escrow.address, 0n)).toBeTruthy();

        // give buyer knowledge of the escrow
        await buyerPXE.registerAccount(escrowMasterKey, await escrow.partialAddress);
        await buyerPXE.registerContract(escrow);
        await escrow
            .withWallet(buyer)
            .methods.sync_private_state()
            .simulate({ from: buyerAddress });

        // transfer tokens back out
        await fillOTCOrder(escrow, buyer, eth, buyTokenAmount);

        // check balances after filling order
        expect(
            expectBalancePrivate(eth, buyerAddress, buyerETHInitialBalance - buyTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(usdc, buyerAddress, sellTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(eth, sellerAddress, buyTokenAmount)).toBeTruthy();
        expect(expectBalancePrivate(usdc, escrow.address, 0n)).toBeTruthy();
    });
});
