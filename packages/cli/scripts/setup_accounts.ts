import "dotenv/config";
import { writeFileSync } from "fs";
import { FeeJuicePaymentMethodWithClaim } from "@aztec/aztec.js/fee";
import {
    getFeeJuicePortalManager,
    setupAccountWithFeeClaim
} from "@aztec-otc-desk/contracts/fees"
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { TestWallet } from "@aztec/test-wallet/server";
import { waitForBlock } from "./utils";
import { AccountManager } from "@aztec/aztec.js/wallet";
import { isTestnet, wad } from "@aztec-otc-desk/contracts/utils";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import type { PXEConfig } from "@aztec/pxe/config";


// get environment variables
const {
    MNEMONIC,
    L1_RPC_URL,
    L2_NODE_URL
} = process.env;
if (!MNEMONIC) {
    throw new Error("MNEMONIC is not defined");
}
if (!L1_RPC_URL) {
    throw new Error("L1_RPC_URL is not defined");
}
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}

// Fund 2 accounts
const main = async () => {
    // Create PXE and FeeJuicePortalManager instances

    const node = createAztecNodeClient(L2_NODE_URL);

    let feeJuicePortalManager;
    let pxeConfig: Partial<PXEConfig> = {};

    if (await isTestnet(node)) {
        feeJuicePortalManager = await getFeeJuicePortalManager(
            node,
            [L1_RPC_URL],
            MNEMONIC
        );
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
    } else {
        feeJuicePortalManager = await getFeeJuicePortalManager(node);
    }


    // create two wallets & make claims (can't do concurrently)
    const sellerWallet = await TestWallet.create(node, pxeConfig);
    const buyerWallet = await TestWallet.create(node, pxeConfig);
    const sellerSetup = await setupAccountWithFeeClaim(sellerWallet, feeJuicePortalManager);
    const buyerSetup = await setupAccountWithFeeClaim(buyerWallet, feeJuicePortalManager);

    // write the accounts
    const accountData = { seller: sellerSetup.key, buyer: buyerSetup.key };

    // save the accounts 
    const accountFilePath = `${__dirname}/../accounts.json`;
    writeFileSync(accountFilePath, JSON.stringify(accountData, null, 2));
    console.log(`Wrote accounts to ${accountFilePath}`);

    // get current block
    const startingBlock = await node.getBlockNumber();
    console.log(`Current block: ${startingBlock} - waiting until block ${startingBlock + 3}`);

    const finalBlock = await waitForBlock(node, startingBlock + 3);
    console.log(`Reached target block of ${finalBlock} - finalizing account deployment!`);

    // deploy accounts
    // const sellerClaimAndPay = new FeeJuicePaymentMethodWithClaim(
    //     sellerSetup.manager.address,
    //     sellerSetup.claim
    // );
    // const sellerDeployMethod = await sellerSetup.manager.getDeployMethod();
    // const sellerDeployReceipt = await sellerDeployMethod.send({
    //     fee: { paymentMethod: sellerClaimAndPay },
    //     from: sellerSetup.manager.address
    // }).wait({ timeout: 3600 });
    // console.log(`Seller account deployed to ${sellerSetup.manager.address} in tx ${sellerDeployReceipt.txHash}`);

    const buyerClaimAndPay = new FeeJuicePaymentMethodWithClaim(
        buyerSetup.manager.address,
        buyerSetup.claim
    );
    const buyerDeployMethod = await buyerSetup.manager.getDeployMethod();
    const buyerDeployReceipt = await buyerDeployMethod.send({
        fee: { paymentMethod: buyerClaimAndPay },
        from: buyerSetup.manager.address
    }).wait({ timeout: 3600 });
    console.log(`Buyer account deployed to ${buyerSetup.manager.address} in tx ${buyerDeployReceipt.txHash}`);
    console.log("Setup complete: accounts deployed to testnet with 1e of feejuice each");
}

main();
