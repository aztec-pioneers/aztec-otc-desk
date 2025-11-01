import "dotenv/config";
import { writeFileSync } from "fs";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { TestWallet } from "@aztec/test-wallet/server";
import { getTestnetSendWaitOptions, waitForBlock } from "./utils";
import { isTestnet } from "@aztec-otc-desk/contracts/utils";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import type { PXEConfig } from "@aztec/pxe/config";
import { Fr } from "@aztec/aztec.js/fields";

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
    // Create Node & PXE Config Options
    const node = createAztecNodeClient(L2_NODE_URL);
    let pxeConfig: Partial<PXEConfig> = {};
    if (await isTestnet(node)) 
        pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };

    // deploy seller account
    const sellerWallet = await TestWallet.create(node, pxeConfig);
    const sellerSecret = Fr.random();
    const sellerSalt = Fr.random();
    const sellerManager = await sellerWallet.createSchnorrAccount(sellerSecret, sellerSalt);
    const sellerOpts = await getTestnetSendWaitOptions(node, sellerWallet, AztecAddress.ZERO);
    await sellerManager.getDeployMethod()
        .then(deployMethod => deployMethod.send(sellerOpts.send).wait(sellerOpts.wait));
    
    // deploy buyer account
    const buyerWallet = await TestWallet.create(node, pxeConfig);
    const buyerSecret = Fr.random();
    const buyerSalt = Fr.random();
    const buyerManager = await buyerWallet.createSchnorrAccount(buyerSecret, buyerSalt);
    const buyerOpts = await getTestnetSendWaitOptions(node, buyerWallet, AztecAddress.ZERO);
    await buyerManager.getDeployMethod()
        .then(deployMethod => deployMethod.send(buyerOpts.send).wait(buyerOpts.wait));

    // save the accounts to fs
    const accountData = {
        seller: { secretKey: sellerSecret, salt: sellerSalt },
        buyer: { secretKey: buyerSecret, salt: buyerSalt },
    }
    const accountFilePath = `${__dirname}/data/accounts.json`;
    writeFileSync(accountFilePath, JSON.stringify(accountData, null, 2));
    console.log(`Wrote accounts to ${accountFilePath}`);

    console.log(`Account Setup complete!`);
}

main();
