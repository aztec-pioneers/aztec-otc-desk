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

  let demoContract: DemoContract;
  let tokenContract: TokenContract;


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
    tokenContract = await deployTokenContractWithMinter(
      { name: "Demo Token", symbol: "DEMO", decimals: 18 },
      minter
    );
    console.log(`Deployed token contract to ${tokenContract.address}`);
    // mint tokens to alice
    await tokenContract
      .withWallet(minter)
      .methods.mint_to_private(
        minter.getAddress(),
        alice.getAddress(),
        wad(1000n)
      )
      .send()
      .wait();
    console.log(`Minted 1000 DEMO to Alice`);
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
    ({ contract: demoContract, secretKey: contractKey } = await deployDemoContract(
      pxe,
      alice,
      tokenContract.address,
      wad(1n),
      "sender_owned"
    ));
    console.log(`Deployed new demo contract to ${demoContract.address}`);
    demoContract = demoContract.withWallet(alice)
    // check balances before
    let aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    let contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(1000n));
    expect(contractBalance).toEqual(0n);

    // execute transfer_private_to_private in via call from demo contract
    /// create authwit
    const nonce = Fr.random();
    const authwit = await alice.createAuthWit({
      caller: demoContract.address,
      action: tokenContract.methods.transfer_private_to_private(
        alice.getAddress(),
        demoContract.address,
        wad(1n),
        nonce,
      ),
    });
    /// send transfer_in with authwit
    await demoContract
      .methods
      .transfer_in(nonce)
      .with({ authWitnesses: [authwit] })
      .send()
      .wait()
    
    // check balances after transfer in
    aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(999n));
    expect(contractBalance).toEqual(wad(1n));

    // transfer tokens back out
    await demoContract
      .methods
      .transfer_out()
      .send()
      .wait()
    
    // check balances after transfer out
    aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(1000n));
    expect(contractBalance).toEqual(0n);
  });

  it("constrained transfer in (self-owned)", async () => {
    // notes are owned by the contract itself
    ({ contract: demoContract, secretKey: contractKey } = await deployDemoContract(
      pxe,
      alice,
      tokenContract.address,
      wad(1n),
      "self_owned"
    ));
    console.log(`Deployed new demo contract to ${demoContract.address}`);
    demoContract = demoContract.withWallet(alice)
    // check balances before
    let aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    let contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(1000n));
    expect(contractBalance).toEqual(0n);

    // execute transfer_private_to_private in via call from demo contract
    /// create authwit
    const nonce = Fr.random();
    const authwit = await alice.createAuthWit({
      caller: demoContract.address,
      action: tokenContract.methods.transfer_private_to_private(
        alice.getAddress(),
        demoContract.address,
        wad(1n),
        nonce,
      ),
    });
    /// send transfer_in with authwit
    await demoContract
      .methods
      .transfer_in(nonce)
      .with({ authWitnesses: [authwit] })
      .send()
      .wait()
    
    // check balances after transfer in
    aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(999n));
    expect(contractBalance).toEqual(wad(1n));

    // transfer tokens back out
    await demoContract
      .methods
      .transfer_out()
      .send()
      .wait()
    
    // check balances after transfer out
    aliceBalance = await tokenContract.methods.balance_of_private(alice.getAddress()).simulate();
    contractBalance = await tokenContract.methods.balance_of_private(demoContract.address).simulate();
    expect(aliceBalance).toEqual(wad(1000n));
    expect(contractBalance).toEqual(0n);
  });
});
