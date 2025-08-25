import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
    AccountWallet,
    CompleteAddress,
    PXE,
    AccountWalletWithSecretKey,
    Fr,
} from "@aztec/aztec.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import {
    deployDemoContract,
    setupSandbox,
    deployTokenContractWithMinter,
    wad,
    depositToEscrow
} from "./utils.js";
import {
    DemoContractContract as DemoContract,
} from "../../artifacts/DemoContract.js";

import {
    TokenContract,
} from "../../artifacts/Token.js";

describe("Private Transfer Demo Test", () => {
    let pxe: PXE;
    let wallets: AccountWalletWithSecretKey[] = [];
    let accounts: CompleteAddress[] = [];

    let minter: AccountWallet;
    let alice: AccountWallet;
    let bob: AccountWallet;

    let contractKey: Fr;

    let escrow: DemoContract;
    let usdc: TokenContract;
    let weth: TokenContract;


    beforeAll(async () => {
        // setup PXE
        pxe = await setupSandbox();
        console.log("PXE Setup")
        // get test accounts
        wallets = await getInitialTestAccountsWallets(pxe);
        accounts = wallets.map((w) => w.getCompleteAddress());
        minter = wallets[0];
        alice = wallets[1];
        bob = wallets[2];
        console.log("Got test accounts");

        // deploy token contract
        usdc = await deployTokenContractWithMinter(
            { name: "USDC Token", symbol: "USDC", decimals: 6 },
            minter
        );
        console.log(`Deployed USDC token contract to ${usdc.address}`);

        weth = await deployTokenContractWithMinter(
            { name: "Wrapped Ether", symbol: "WETH", decimals: 18 },
            minter
        );

        console.log(`Deployed WETH token contract to ${weth.address}`);
        // mint tokens to alice
        await usdc
            .withWallet(minter)
            .methods.mint_to_private(
                minter.getAddress(),
                alice.getAddress(),
                wad(10000n, 6n)
            )
            .send()
            .wait();
        console.log(`Minted 10000 USDC to Alice`);
    });


    it("check escrow key leaking", async () => {

    })
    
    // })

    it("e2e", async () => {
        // notes are owned by the deploying account
        ({ contract: escrow, secretKey: contractKey } = await deployDemoContract(
            pxe,
            alice,
            usdc.address,
            wad(1000n, 6n),
            weth.address,
            wad(1n),
        ));
        console.log(`Deployed new escrow contract to ${escrow.address}`);
        escrow = escrow.withWallet(alice)

        // get maker secret value
        const makerSecret = await escrow.methods.get_maker_secret().simulate();

        // check balances before
        let aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        let contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        expect(aliceBalance).toEqual(wad(10000n, 6n));
        expect(contractBalance).toEqual(0n);

        // deposit tokens into the escrow
        await depositToEscrow(
            escrow,
            alice,
            usdc,
            wad(1000n, 6n),
            makerSecret
        );
        
        // check balances after transfer in
        aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        expect(aliceBalance).toEqual(wad(9000n, 6n));
        expect(contractBalance).toEqual(wad(1000n, 6n));

        // // transfer tokens back out
        // await escrow
        //     .methods
        //     .transfer_out_offered_token()
        //     .send()
        //     .wait()

        // // check balances after transfer out
        // aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        // contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        // expect(aliceBalance).toEqual(wad(10000n, 6n));
        // expect(contractBalance).toEqual(0n);

        console.log("Check passed");
    });

});
