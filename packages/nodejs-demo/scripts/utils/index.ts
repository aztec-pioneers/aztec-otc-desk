import { getSchnorrAccount, SchnorrAccountContractArtifact } from "@aztec/accounts/schnorr";
import { wad } from "../../../contracts/ts/test/utils/index.js";
import { AccountWalletWithSecretKey, Fr, type PXE } from "@aztec/aztec.js";
import accounts from "../data/accounts.json";
import { deriveSigningKey } from "@aztec/stdlib/keys";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";

export const ethMintAmount = wad(1n);
export const usdcMintAmount = wad(5000n);

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
};

export const isTestnet = async (pxe: PXE): Promise<boolean> => {
    const chainId = (await pxe.getNodeInfo()).l1ChainId;
    return chainId === 11155111; // Sepolia testnet
}

export * from "./api";
export * from "./types";