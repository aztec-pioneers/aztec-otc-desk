import "dotenv/config";
import { writeFileSync } from "fs";
import readline from "readline";
import {
    AccountManager,
    AccountWalletWithSecretKey,
    FeeJuicePaymentMethodWithClaim,
    Fr, L1FeeJuicePortalManager,
    sleep,
    type L2AmountClaim,
    type PXE
} from "@aztec/aztec.js";
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { deriveSigningKey } from "@aztec/stdlib/keys";
import {
    createPXE,
    wad,
    getFeeJuicePortalManager
} from "@aztec-otc-desk/contracts"


const {
    MNEMONIC,
    L1_RPC_URL,
    L2_NODE_URL
} = process.env;

if (!MNEMONIC || !L1_RPC_URL || !L2_NODE_URL) {
    throw new Error("Missing environment variables");
}

const waitForBlock = async (pxe: PXE, targetBlock: number) => {
    return new Promise((resolve) => {
        let currentBlock = 0;
        let seconds = 0;

        const interval = setInterval(async () => {
            if (seconds % 5 === 0) {
                (async () => {
                    currentBlock = await pxe.getBlockNumber();
                })();
            }
            seconds++;
            const dots = '.'.repeat((seconds - 1) % 4);

            readline.clearLine(process.stdout, 0);
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`Current block: ${currentBlock} (waiting until ${targetBlock})${dots}`);

            if (currentBlock >= targetBlock) {
                clearInterval(interval);
                process.stdout.write('\n');
                resolve(currentBlock);
            }
        }, 1000);
    });
};

/**
 * Sets up an account with a claim
 * 
 * @param pxe PXE instance
 * @param feeJuicePortalManager L1FeeJuicePortalManager instance
 * @returns
 *      - account: the account that was created
 *      - claim: the claim to make once enough blocks have passed
 */
const setupAccountWithClaim = async (
    pxe: PXE,
    feeJuicePortalManager: L1FeeJuicePortalManager
): Promise<{
    account: AccountManager,
    wallet: AccountWalletWithSecretKey,
    claim: L2AmountClaim,
}> => {
    const masterKey = Fr.random();
    const account = await getSchnorrAccount(
        pxe,
        masterKey,
        deriveSigningKey(masterKey),
        Fr.random() // salt
    );
    const wallet = await account.getWallet();
    const claim = await feeJuicePortalManager.bridgeTokensPublic(
        account.getAddress(),
        wad(1n),
        true
    );

    return { account, wallet, claim };
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
    const sellerSetup = await setupAccountWithClaim(pxe, feeJuicePortalManager);
    const buyerSetup = await setupAccountWithClaim(pxe, feeJuicePortalManager);

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
