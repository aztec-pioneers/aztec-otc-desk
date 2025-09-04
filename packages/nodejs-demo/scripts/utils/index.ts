import { getSchnorrAccount, SchnorrAccountContractArtifact } from "@aztec/accounts/schnorr";
import { wad, isTestnet, getPriorityFeeOptions, getSponsoredFeePaymentMethod } from "@aztec-otc-desk/contracts";
import { AccountWalletWithSecretKey, Fr, type PXE, type SendMethodOptions } from "@aztec/aztec.js";
import accounts from "../data/accounts.json";
import { deriveSigningKey } from "@aztec/stdlib/keys";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";

export const ethMintAmount = wad(1n);
export const usdcMintAmount = wad(5000n);

/**
 * In high fee environments (testnet) get send options
 * @param pxe - the PXE to execute with
 * @param withFPC - if true, use sponsored FPC
 * @returns send options optimized for testnet
 */
export const getFeeSendOptions = async (pxe: PXE, withFPC: boolean): Promise<SendMethodOptions> => {
    let sendOptions: SendMethodOptions = {};
    if (await isTestnet(pxe)) {
        // const paymentMethod = await getSponsoredFeePaymentMethod(pxe);
        let fee = await getPriorityFeeOptions(pxe, 100, 10n);
        // fee = { ...fee, paymentMethod };
        sendOptions = { fee };
    }
    return sendOptions;
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
        const wallets = await getInitialTestAccountsWallets(pxe);
        if (!wallets[0]) throw new Error("Seller/ Minter not found");
        if (!wallets[1]) throw new Error("Buyer not found");
        seller = wallets[0];
        buyer = wallets[1];
    } else {
        // if testnet, get accounts from env (should run setup_accounts.ts first)
        seller = await getAccountFromEnv("seller", pxe);
        buyer = await getAccountFromEnv("buyer", pxe);
        await pxe.registerSender(seller.getAddress());
        await pxe.registerSender(buyer.getAddress());
    }
    return { seller, buyer };
}

export const getAccountFromEnv = async (
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

export * from "./api.js";
export * from "./types.js";