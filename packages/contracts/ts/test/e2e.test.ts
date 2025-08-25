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
    wad
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


    // it("unconstrained transfer in", async () => {
    //   ({ contract: demoContract, secretKey: contractKey } = await deployDemoContract(
    //     pxe,
    //     alice,
    //     tokenContract.address,
    //     wad(1n)
    //   ));
    //   console.log(`Deployed new demo contract to ${demoContract.address}`);

    //   tokenContract = tokenContract.withWallet(alice);
    //   // check balances before
    //   let aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    //   let contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    //   expect(aliceBalance).toEqual(wad(1000n));
    //   expect(contractBalance).toEqual(0n);

    //   // execute transfer_private_to_private directly from token contract
    //   tokenContract
    //     .methods
    //     .transfer_private_to_private(
    //       alice.getAddress(),
    //       demoContract.address,
    //       wad(1n),
    //       0
    //     )
    //     .send()
    //     .wait()

    //   // check balances after transfer in
    //   aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    //   contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    //   expect(aliceBalance).toEqual(wad(999n));
    //   expect(contractBalance).toEqual(wad(1n));

    //   // transfer tokens back out
    //   await demoContract
    //     .methods
    //     .transfer_out()
    //     .send()
    //     .wait()

    //   // check balances after transfer out
    //   aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    //   contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    //   expect(aliceBalance).toEqual(wad(1000n));
    //   expect(contractBalance).toEqual(0n);
    // })

    it("constrained transfer in (sender-owned)", async () => {
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
        // check balances before
        let aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        let contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        expect(aliceBalance).toEqual(wad(10000n, 6n));
        expect(contractBalance).toEqual(0n);

        // execute transfer_private_to_private in via call from demo contract
        /// create authwit
        const nonce = Fr.random();
        const authwit = await alice.createAuthWit({
            caller: escrow.address,
            action: usdc.methods.transfer_private_to_private(
                alice.getAddress(),
                escrow.address,
                wad(1000n, 6n),
                nonce,
            ),
        });
        /// send transfer_in with authwit
        await escrow
            .methods
            .transfer_in_offered_token(nonce)
            .with({ authWitnesses: [authwit] })
            .send()
            .wait()

        // check balances after transfer in
        aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        expect(aliceBalance).toEqual(wad(9000n, 6n));
        expect(contractBalance).toEqual(wad(1000n, 6n));

        // transfer tokens back out
        await escrow
            .methods
            .transfer_out_offered_token()
            .send()
            .wait()

        // check balances after transfer out
        aliceBalance = await usdc.methods.balance_of_private(alice.getAddress()).simulate();
        contractBalance = await usdc.methods.balance_of_private(escrow.address).simulate();
        expect(aliceBalance).toEqual(wad(10000n, 6n));
        expect(contractBalance).toEqual(0n);

        console.log("Check passed");
    });

});
