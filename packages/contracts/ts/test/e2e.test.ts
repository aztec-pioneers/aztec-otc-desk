import { before, describe, test } from "node:test";
import { expect } from '@jest/globals';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/aztec.js/fields';
import { createAztecNodeClient, type AztecNode } from "@aztec/aztec.js/node";
import { TestWallet } from '@aztec/test-wallet/server';
import { OTCEscrowContract, TokenContract } from "@aztec-otc-desk/contracts/artifacts";
import { TOKEN_METADATA, EscrowConfig} from "@aztec-otc-desk/contracts/constants";
import {
    deployEscrowContract,
    deployTokenContract,
    depositToEscrow,
    expectBalancePrivate,
    fillOTCOrder,
    getEscrowConfig
} from "@aztec-otc-desk/contracts/contract";
import { wad } from "@aztec-otc-desk/contracts/utils";

const { AZTEC_NODE_URL = "http://localhost:8080" } = process.env;

describe("Private Transfer Demo Test", () => {

    let node: AztecNode;

    let minterWallet: TestWallet;
    let sellerWallet: TestWallet;
    let buyerWallet: TestWallet;

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

    before(async () => {
        // setup aztec node client
        node = createAztecNodeClient(AZTEC_NODE_URL);
        console.log(`Connected to Aztec node at "${AZTEC_NODE_URL}"`);

        // setup wallets
        minterWallet = await TestWallet.create(node);
        sellerWallet = await TestWallet.create(node);
        buyerWallet = await TestWallet.create(node);
        const [minterAccount, buyerAccount, sellerAccount] = await getInitialTestAccountsData();

        await minterWallet.createSchnorrAccount(minterAccount.secret, minterAccount.salt);
        minterAddress = await minterWallet.getAccounts().then(accounts => accounts[0].item);
        await sellerWallet.createSchnorrAccount(sellerAccount.secret, sellerAccount.salt);
        sellerAddress = await sellerWallet.getAccounts().then(accounts => accounts[0].item);
        await buyerWallet.createSchnorrAccount(buyerAccount.secret, buyerAccount.salt);
        buyerAddress = await buyerWallet.getAccounts().then(accounts => accounts[0].item);

        // connect accounts to eachother
        await minterWallet.registerSender(sellerAddress);
        await minterWallet.registerSender(buyerAddress);
        await sellerWallet.registerSender(minterAddress);
        await sellerWallet.registerSender(buyerAddress);
        await buyerWallet.registerSender(minterAddress);
        await buyerWallet.registerSender(sellerAddress);

        // deploy token contracts
        usdc = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.usdc);
        eth = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.eth);

        // register token contracts in other wallets
        await sellerWallet.registerContract(usdc);
        await sellerWallet.registerContract(eth);
        await buyerWallet.registerContract(usdc);
        await buyerWallet.registerContract(eth);

        // mint tokens
        await eth
            .withWallet(minterWallet)
            .methods.mint_to_private(
                buyerAddress,
                wad(4n, 18n)
            )
            .send({ from: minterAddress })
            .wait();
        await usdc
            .withWallet(minterWallet)
            .methods.mint_to_private(
                sellerAddress,
                wad(10000n, 6n)
            )
            .send({ from: minterAddress })
            .wait();
    });

    test("check escrow key leaking", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerWallet,
            sellerAddress,
            usdc.address,
            sellTokenAmount,
            eth.address,
            buyTokenAmount,
        ));

        // Check seller Escrow
        const sellerConfig = await getEscrowConfig(sellerWallet, sellerAddress, escrow);
        expect(sellerConfig.owner).toEqual(escrow.address);
        expect(sellerConfig.sell_token_address).toEqual(usdc.address);
        expect(sellerConfig.sell_token_amount).toEqual(sellTokenAmount);
        expect(sellerConfig.buy_token_address).toEqual(eth.address);
        expect(sellerConfig.buy_token_amount).toEqual(buyTokenAmount);
        expect(sellerConfig.randomness).not.toEqual(0n);

        // register contract without decryption keys
        await buyerWallet.registerContract(escrow);

        // check if maker note exists
        expect(async () => {
            await escrow
                .withWallet(buyerWallet)
                .methods.get_config()
                .simulate({ from: buyerAddress });
        }).toThrow()

        // add account to buyer pxe
        await buyerWallet.registerContract(escrow, undefined, escrowMasterKey);
        await escrow
            .withWallet(buyerWallet)
            .methods.sync_private_state()
            .simulate({ from: buyerAddress });
        const buyerDefinition = await escrow
            .withWallet(buyerWallet)
            .methods
            .get_config()
            .simulate({ from: buyerAddress });
        expect(buyerDefinition.owner).not.toEqual(0n);
    });

    test("e2e", async () => {
        // deploy new escrow instance
        ({ contract: escrow, secretKey: escrowMasterKey } = await deployEscrowContract(
            sellerWallet,
            sellerAddress,
            usdc.address,
            sellTokenAmount,
            eth.address,
            buyTokenAmount,
        ));

        // check balances before
        expect(
            expectBalancePrivate(sellerWallet, sellerAddress, usdc, sellerUSDCInitialBalance)
        ).toBeTruthy();
        expect(
            expectBalancePrivate(sellerWallet, escrow.address, usdc, 0n)
        ).toBeTruthy();

        // deposit tokens into the escrow
        await depositToEscrow(sellerWallet, sellerAddress, escrow, usdc, sellTokenAmount);

        // check USDC balances after transfer in
        const expectedUSDCAfterDeposit = sellerUSDCInitialBalance - sellTokenAmount;
        expect(
            expectBalancePrivate(sellerWallet, sellerAddress, usdc, expectedUSDCAfterDeposit)
        ).toBeTruthy();
        expect(
            expectBalancePrivate(sellerWallet, escrow.address, usdc, sellTokenAmount)
        ).toBeTruthy();


        // check buyer balance balances before filling order
        expect(
            expectBalancePrivate(buyerWallet, sellerAddress, eth, buyerETHInitialBalance)
        ).toBeTruthy();
        expect(expectBalancePrivate(buyerWallet, sellerAddress, usdc, 0n)).toBeTruthy();
        expect(expectBalancePrivate(buyerWallet, escrow.address, eth, 0n)).toBeTruthy();

        // give buyer knowledge of the escrow
        await buyerWallet.registerContract(escrow, undefined, escrowMasterKey);

        // transfer tokens back out
        await fillOTCOrder(buyerWallet, buyerAddress, escrow, eth, buyTokenAmount);

        // check balances after filling order
        const expectedETHAfterFill = buyerETHInitialBalance - buyTokenAmount;
        expect(
            expectBalancePrivate(buyerWallet, buyerAddress, eth, expectedETHAfterFill)
        ).toBeTruthy();
        expect(
            expectBalancePrivate(buyerWallet, buyerAddress, usdc, sellTokenAmount)
        ).toBeTruthy();
        expect(expectBalancePrivate(buyerWallet, escrow.address, usdc, 0n)).toBeTruthy();
        expect(
            expectBalancePrivate(sellerWallet, sellerAddress, eth, buyTokenAmount)
        ).toBeTruthy();
    });
});
