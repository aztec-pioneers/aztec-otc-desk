import { getSchnorrAccount, SchnorrAccountContractArtifact } from "@aztec/accounts/schnorr";
import { wad, isTestnet, getPriorityFeeOptions, getSponsoredFeePaymentMethod } from "@aztec-otc-desk/contracts";
import { AccountWalletWithSecretKey, Fr, type PXE, type SendMethodOptions, type WaitOpts } from "@aztec/aztec.js";
import accounts from "../data/accounts.json";
import { deriveSigningKey } from "@aztec/stdlib/keys";
import { getInitialTestAccountsManagers } from "@aztec/accounts/testing";
import readline from "readline";

export const ethMintAmount = wad(1n);
export const usdcMintAmount = wad(5000n);

/**
 * In high fee environments (testnet) get send and wait options
 * @param pxe - the PXE to execute with
 * @param withFPC - if true, use sponsored FPC
 * @returns send/ wait options optimized for testnet
 */
export const getTestnetSendWaitOptions = async (
    pxe: PXE,
    withFPC: boolean = false
): Promise<{
    send: SendMethodOptions,
    wait: WaitOpts
}> => {
    let sendOptions: SendMethodOptions = {};
    let waitOptions: WaitOpts = {};
    if (await isTestnet(pxe)) {
        let fee = await getPriorityFeeOptions(pxe, 100, 10n);
        if (withFPC) {
            const paymentMethod = await getSponsoredFeePaymentMethod(pxe);
            fee = { ...fee, paymentMethod };
        }
        sendOptions = { fee };
        waitOptions = { timeout: 3600 };
    }
    return { send: sendOptions, wait: waitOptions };
}

export const getOTCAccounts = async (pxe: PXE): Promise<{
    seller: AccountWalletWithSecretKey,
    buyer: AccountWalletWithSecretKey
}> => {
    // check if testnet
    const testnet = await isTestnet(pxe);
    let seller: AccountWalletWithSecretKey;
    let buyer: AccountWalletWithSecretKey;
    if (!testnet) {
        // if sandbox, get initialized test accounts
        const wallets = await getInitialTestAccountsManagers(pxe);
        if (!wallets[0]) throw new Error("Seller/ Minter not found");
        if (!wallets[1]) throw new Error("Buyer not found");
        seller = await wallets[0].getWallet();
        buyer = await wallets[1].getWallet();
    } else {
        // if testnet, get accounts from env (should run setup_accounts.ts first)
        seller = await getAccountFromFs("seller", pxe);
        buyer = await getAccountFromFs("buyer", pxe);
        await pxe.registerSender(seller.getAddress());
        await pxe.registerSender(buyer.getAddress());
    }
    return { seller, buyer };
}

export const getAccountFromFs = async (
    accountType: "seller" | "buyer",
    pxe: PXE
): Promise<AccountWalletWithSecretKey> => {
    // reinstantiate the account
    const account = accounts[accountType];
    const secretKey = Fr.fromString(account.secretKey);
    const signingKey = deriveSigningKey(secretKey);
    const salt = Fr.fromString(account.salt);
    const accountManager = await getSchnorrAccount(pxe, secretKey, signingKey, salt);
    // ensure it is registered in the pxe
    const partialAddress = (await accountManager.getCompleteAddress()).partialAddress;
    await pxe.registerAccount(secretKey, partialAddress);
    await pxe.registerContract({
        instance: accountManager.getInstance(),
        artifact: SchnorrAccountContractArtifact
    });
    return accountManager.getWallet();
}

export const waitForBlock = async (pxe: PXE, targetBlock: number) => {
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


export * from "./api.js";
export * from "./types.js";