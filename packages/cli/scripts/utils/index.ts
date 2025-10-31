// import { getSchnorrAccount, SchnorrAccountContractArtifact } from "@aztec/accounts/schnorr";
// import { wad, isTestnet, getPriorityFeeOptions, getSponsoredFeePaymentMethod } from "@aztec-otc-desk/contracts";
// import { AccountWalletWithSecretKey, AztecAddress, Fr, type PXE, type SendMethodOptions, type WaitOpts } from "@aztec/aztec.js";
import { TestWallet } from "@aztec/test-wallet/server";
import { deriveSigningKey } from "@aztec/stdlib/keys";
import { getInitialTestAccountsData } from "@aztec/accounts/testing";
import { wad } from "@aztec-otc-desk/contracts/utils";
import readline from "readline";
import accounts from "../data/accounts.json";
import type { SendInteractionOptions, WaitOpts } from "@aztec/aztec.js/contracts";
import { BaseWallet } from "@aztec/aztec.js/wallet";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import type { AztecNode } from "@aztec/aztec.js/node";

export const ETH_MINT_AMOUNT = wad(10n);
export const ETH_SWAP_AMOUNT = ETH_MINT_AMOUNT / 10n;
export const USDC_MINT_AMOUNT = wad(50000n);
export const USDC_SWAP_AMOUNT = USDC_MINT_AMOUNT / 10n;
export const testnetBaseFeePadding = 100; // pad by 100%
export const testnetPriorityFee = 10n; // multiply base fee allowance by 10x
export const testnetTimeout = 3600; // seconds until timeout waiting for send
export const testnetInterval = 3; // seconds between polling for tx
/**
 * In high fee environments (testnet) get send and wait options
 * @param pxe - the PXE to execute with
 * @param withFPC - if true, use sponsored FPC
 * @returns send/ wait options optimized for testnet
 */
export const getTestnetSendWaitOptions = async (
    wallet: BaseWallet,
    sender: AztecAddress,
    withFPC: boolean = true,
): Promise<{
    send: SendInteractionOptions,
    wait: WaitOpts
}> => {
    let send = { from: sender };
    let wait: WaitOpts = {};
    // if (await isTestnet(pxe)) {
    //     let fee = await getPriorityFeeOptions(
    //         pxe,
    //         testnetBaseFeePadding,
    //         testnetPriorityFee
    //     );
    //     if (withFPC) {
    //         const paymentMethod = await getSponsoredFeePaymentMethod(pxe);
    //         fee = { ...fee, paymentMethod };
    //     }
    //     send = { ...send, fee };
    //     wait = { timeout: testnetTimeout, interval: testnetInterval };
    // }
    return { send, wait };
}

export const getOTCAccounts = async (node: AztecNode): Promise<{
    sellerWallet: TestWallet,
    sellerAddress: AztecAddress,
    buyerWallet: TestWallet,
    buyerAddress: AztecAddress
}> => {
    // check if testnet
    // const testnet = await isTestnet(pxe);
    // todo: set proving to true in testwallet if testnet
    const testnet = false;
    let sellerWallet = await TestWallet.create(node);
    let buyerWallet = await TestWallet.create(node);
    let sellerAddress: AztecAddress;
    let buyerAddress: AztecAddress;
    if (!testnet) {
        // if sandbox, get initialized test accounts
        // get account data
        const [sellerAccount, buyerAccount] = await getInitialTestAccountsData();
        if (!sellerAccount) throw new Error("Seller/ Minter not found");
        if (!buyerAccount) throw new Error("Buyer not found");
        // create accounts
        await sellerWallet.createSchnorrAccount(sellerAccount.secret, sellerAccount.salt);
        sellerAddress = await sellerWallet.getAccounts().then(accounts => accounts[0]!.item);
        await buyerWallet.createSchnorrAccount(buyerAccount.secret, buyerAccount.salt);
        buyerAddress = await buyerWallet.getAccounts().then(accounts => accounts[0]!.item);

        // register accounts to eachother
        await sellerWallet.registerSender(buyerAddress);
        await buyerWallet.registerSender(sellerAddress);
    } else {
        // if testnet, get accounts from env (should run setup_accounts.ts first)
        // seller = await getAccountFromFs("seller", pxe);
        // buyer = await getAccountFromFs("buyer", pxe);
        // await pxe.registerSender(seller.getAddress());
        // await pxe.registerSender(buyer.getAddress());
        sellerAddress = AztecAddress.ZERO;
        buyerAddress = AztecAddress.ZERO;
    }
    return { sellerWallet, sellerAddress, buyerWallet, buyerAddress };
}

// export const getAccountFromFs = async (
//     accountType: "seller" | "buyer",
//     pxe: PXE
// ): Promise<AccountWalletWithSecretKey> => {
//     // reinstantiate the account
//     const account = accounts[accountType];
//     const secretKey = Fr.fromString(account.secretKey);
//     const signingKey = deriveSigningKey(secretKey);
//     const salt = Fr.fromString(account.salt);
//     const accountManager = await getSchnorrAccount(pxe, secretKey, signingKey, salt);
//     // ensure it is registered in the pxe
//     const partialAddress = (await accountManager.getCompleteAddress()).partialAddress;
//     await pxe.registerAccount(secretKey, partialAddress);
//     await pxe.registerContract({
//         instance: accountManager.getInstance(),
//         artifact: SchnorrAccountContractArtifact
//     });
//     return accountManager.getWallet();
// }

// export const waitForBlock = async (pxe: PXE, targetBlock: number) => {
//     return new Promise((resolve) => {
//         let currentBlock = 0;
//         let seconds = 0;

//         const interval = setInterval(async () => {
//             if (seconds % 5 === 0) {
//                 (async () => {
//                     currentBlock = await pxe.getBlockNumber();
//                 })();
//             }
//             seconds++;
//             const dots = '.'.repeat((seconds - 1) % 4);

//             readline.clearLine(process.stdout, 0);
//             readline.cursorTo(process.stdout, 0);
//             process.stdout.write(`Current block: ${currentBlock} (waiting until ${targetBlock})${dots}`);

//             if (currentBlock >= targetBlock) {
//                 clearInterval(interval);
//                 process.stdout.write('\n');
//                 resolve(currentBlock);
//             }
//         }, 1000);
//     });
// };


export * from "./api.js";
export * from "./types.js";