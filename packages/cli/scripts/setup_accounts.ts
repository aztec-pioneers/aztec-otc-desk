import "dotenv/config";
import { writeFileSync } from "fs";
import { FeeJuicePaymentMethodWithClaim } from "@aztec/aztec.js";
import {
    createPXE,
    getFeeJuicePortalManager,
    setupAccountWithFeeClaim
} from "@aztec-otc-desk/contracts"
import { waitForBlock } from "./utils";


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
    const pxe = await createPXE();
    const feeJuicePortalManager = await getFeeJuicePortalManager(
        pxe,
        [L1_RPC_URL],
        MNEMONIC
    );

    // create two accounts & make claims (can't do concurrently)
    const sellerSetup = await setupAccountWithFeeClaim(pxe, feeJuicePortalManager);
    const buyerSetup = await setupAccountWithFeeClaim(pxe, feeJuicePortalManager);

    console.log("SELLER CLAIM: ", sellerSetup.claim);
    console.log("BUYER CLAIM: ", buyerSetup.claim);

    // write the accounts
    const accountData = {
        seller: {
            secretKey: sellerSetup.wallet.getSecretKey(),
            salt: sellerSetup.wallet.salt,
        },
        buyer: {
            secretKey: buyerSetup.wallet.getSecretKey(),
            salt: buyerSetup.wallet.salt,
        }
    }
    // save the accounts 

    const accountFilePath = `${__dirname}/../accounts.json`;
    writeFileSync(accountFilePath, JSON.stringify(accountData, null, 2));
    console.log(`Wrote accounts to ${accountFilePath}`);

    // get current block
    const startingBlock = await pxe.getBlockNumber();
    console.log(`Current block: ${startingBlock} - waiting until block ${startingBlock + 3}`);

    const finalBlock = await waitForBlock(pxe, startingBlock + 3);
    console.log(`Reached target block of ${finalBlock} - finalizing account deployment!`);

    // deploy accounts
    const sellerClaimAndPay = new FeeJuicePaymentMethodWithClaim(
        sellerSetup.wallet,
        sellerSetup.claim
    );
    const sellerDeployReceipt = await sellerSetup.account.deploy({
        fee: { paymentMethod: sellerClaimAndPay },
    }).wait({ timeout: 3600 });
    console.log(`Seller account deployed to ${sellerSetup.wallet.getAddress()} in tx ${sellerDeployReceipt.txHash}`);

    const buyerClaimAndPay = new FeeJuicePaymentMethodWithClaim(
        buyerSetup.wallet,
        buyerSetup.claim
    );
    const buyerDeployReceipt = await buyerSetup.account.deploy({
        fee: { paymentMethod: buyerClaimAndPay }
    }).wait({ timeout: 3600 });
    console.log(`Buyer account deployed to ${buyerSetup.wallet.getAddress()} in tx ${buyerDeployReceipt.txHash}`);
    console.log("Setup complete: accounts deployed to testnet with 1e of feejuice each");
}

main();
