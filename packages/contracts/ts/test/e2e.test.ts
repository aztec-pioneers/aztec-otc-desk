import { before, describe, test } from "node:test";
import { expect } from '@jest/globals';
import { getInitialTestAccountsData } from '@aztec/accounts/testing';
import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Fr } from '@aztec/aztec.js/fields';
import { createAztecNodeClient, type AztecNode } from "@aztec/aztec.js/node";
import { EmbeddedWallet } from '@aztec/wallets/embedded';
import { OTCEscrowContract, OTCEscrowContractArtifact, TokenContract, TokenContractArtifact } from "@aztec-otc-desk/contracts/artifacts";
import { TOKEN_METADATA } from "@aztec-otc-desk/contracts/constants";
import {
    deployEscrowContract,
    deployTokenContract,
    depositToEscrow,
    expectBalancePrivate,
    fillOTCOrder,
    getEscrowConfig
} from "@aztec-otc-desk/contracts/contract";
import { precision } from "@aztec-otc-desk/contracts/utils";
import type { ContractInstanceWithAddress } from "@aztec/stdlib/contract";
import { sleep } from "bun";

const { AZTEC_NODE_URL = "http://localhost:8080" } = process.env;

describe("Private Transfer Demo Test", () => {

    let node: AztecNode;

    let minterWallet: EmbeddedWallet;
    let sellerWallet: EmbeddedWallet;
    let buyerWallet: EmbeddedWallet;

    let minterAddress: AztecAddress;
    let sellerAddress: AztecAddress;
    let buyerAddress: AztecAddress;

    let escrowMasterKey: Fr;

    let escrow: OTCEscrowContract;
    let usdc: TokenContract;
    let eth: TokenContract;
    let escrowInstance: ContractInstanceWithAddress;
    let usdcInstance: ContractInstanceWithAddress;
    let ethInstance: ContractInstanceWithAddress;

    const sellTokenAmount = precision(1000n, 6n);
    const buyTokenAmount = precision(1n);
    const sellerUSDCInitialBalance = precision(10000n, 6n);
    const buyerETHInitialBalance = precision(4n);

    before(async () => {
        // setup aztec node client
        node = createAztecNodeClient(AZTEC_NODE_URL);
        console.log(`Connected to Aztec node at "${AZTEC_NODE_URL}"`);

        // setup wallets
        minterWallet = await EmbeddedWallet.create(node, { ephemeral: true, pxeConfig: { proverEnabled: false } });
        sellerWallet = await EmbeddedWallet.create(node, { ephemeral: true, pxeConfig: { proverEnabled: false } });
        buyerWallet = await EmbeddedWallet.create(node, { ephemeral: true, pxeConfig: { proverEnabled: false } });
        const [minterAccount, buyerAccount, sellerAccount] = await getInitialTestAccountsData();

        minterAddress = (await minterWallet.createSchnorrAccount(minterAccount.secret, minterAccount.salt, minterAccount.signingKey)).address;
        sellerAddress = (await sellerWallet.createSchnorrAccount(sellerAccount.secret, sellerAccount.salt, sellerAccount.signingKey)).address;
        buyerAddress = (await buyerWallet.createSchnorrAccount(buyerAccount.secret, buyerAccount.salt, buyerAccount.signingKey)).address;

        // connect accounts to eachother
        await minterWallet.registerSender(sellerAddress, "seller");
        await minterWallet.registerSender(buyerAddress, "buyer");
        await sellerWallet.registerSender(minterAddress, "minter");
        await sellerWallet.registerSender(buyerAddress, "buyer");
        await buyerWallet.registerSender(minterAddress, "minter");
        await buyerWallet.registerSender(sellerAddress, "seller");

        // // deploy token contracts
        ({
            contract: usdc, instance: usdcInstance
        } = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.usdc));
        ({
            contract: eth, instance: ethInstance
        } = await deployTokenContract(minterWallet, minterAddress, TOKEN_METADATA.eth))

        // register token contracts in other wallets
        await sellerWallet.registerContract(usdcInstance, TokenContractArtifact);
        await sellerWallet.registerContract(ethInstance, TokenContractArtifact);
        await buyerWallet.registerContract(usdcInstance, TokenContractArtifact);
        await buyerWallet.registerContract(ethInstance, TokenContractArtifact);

        // mint tokens
        await eth
            .withWallet(minterWallet)
            .methods.mint_to_private(
                buyerAddress,
                precision(4n, 18n)
            )
            .send({ from: minterAddress });
        await usdc
            .withWallet(minterWallet)
            .methods.mint_to_private(
                sellerAddress,
                precision(10000n, 6n)
            )
            .send({ from: minterAddress });
    });

    test("check escrow key leaking", async () => {
        // deploy new escrow instance
        ({
            contract: escrow,
            instance: escrowInstance,
            secretKey: escrowMasterKey
        } = await deployEscrowContract(
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
        await buyerWallet.registerContract(escrowInstance, OTCEscrowContractArtifact);

        // check if maker note exists
        expect(async () => { await getEscrowConfig(buyerWallet, buyerAddress, escrow)}).toThrow()

        // add account to buyer pxe
        await buyerWallet.registerContract(escrowInstance, OTCEscrowContractArtifact, escrowMasterKey);
        const buyerConfig = await getEscrowConfig(buyerWallet, buyerAddress, escrow)
        expect(buyerConfig.owner).not.toEqual(0n);
    });

    test.skip("e2e", async () => {
        // deploy new escrow instance
        ({
            contract: escrow,
            instance: escrowInstance,
            secretKey: escrowMasterKey
        } = await deployEscrowContract(
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
        await buyerWallet.registerContract(escrowInstance, OTCEscrowContractArtifact, escrowMasterKey);

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
