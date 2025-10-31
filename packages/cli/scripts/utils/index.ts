import { TestWallet } from "@aztec/test-wallet/server";
import { getInitialTestAccountsData } from "@aztec/accounts/testing";
import { isTestnet, wad } from "@aztec-otc-desk/contracts/utils";
import { getPriorityFeeOptions } from "@aztec-otc-desk/contracts/fees";
import readline from "readline";
import accounts from "../data/accounts.json";
import type { SendInteractionOptions, WaitOpts } from "@aztec/aztec.js/contracts";
import { AztecAddress } from "@aztec/stdlib/aztec-address";
import type { AztecNode } from "@aztec/aztec.js/node";
import { Fr } from "@aztec/aztec.js/fields";
import type { PXEConfig } from "@aztec/pxe/config"

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
    node: AztecNode,
    sender: AztecAddress,
    withFPC: boolean = true,
): Promise<{
    send: SendInteractionOptions,
    wait: WaitOpts
}> => {
    let send: SendInteractionOptions = { from: sender };
    let wait: WaitOpts = {};
    if (await isTestnet(node)) {
        let fee = await getPriorityFeeOptions(node, testnetPriorityFee);
        // if (withFPC) {
        //     const paymentMethod = await getSpon(pxe);
        //     fee = { ...fee, paymentMethod };
        // }
        send = { ...send, fee };
        wait = { timeout: testnetTimeout, interval: testnetInterval };
    }
    return { send, wait };
}

export const getOTCAccounts = async (
    node: AztecNode,
    pxeConfig: Partial<PXEConfig> = {}
): Promise<{
    sellerWallet: TestWallet,
    sellerAddress: AztecAddress,
    buyerWallet: TestWallet,
    buyerAddress: AztecAddress,
}> => {
    // check if testnet
    let sellerWallet = await TestWallet.create(node, pxeConfig);
    let buyerWallet = await TestWallet.create(node, pxeConfig);
    let sellerAddress: AztecAddress;
    let buyerAddress: AztecAddress;
    if (await isTestnet(node)) {
        // if sandbox, get initialized test accounts
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
        sellerAddress = await getAccountFromFs("seller", sellerWallet);
        buyerAddress = await getAccountFromFs("buyer", buyerWallet);
        await sellerWallet.registerSender(buyerAddress);
        await buyerWallet.registerSender(sellerAddress);
    }
    return { sellerWallet, sellerAddress, buyerWallet, buyerAddress };
}

export const getAccountFromFs = async (
    accountType: "seller" | "buyer",
    wallet: TestWallet
): Promise<AztecAddress> => {
    // reinstantiate the account
    const accountSecret = accounts[accountType];
    const secretKey = Fr.fromString(accountSecret.secretKey);
    const salt = Fr.fromString(accountSecret.salt);
    const manager = await wallet.createSchnorrAccount(secretKey, salt);
    return manager.address;
}

export const waitForBlock = async (node: AztecNode, targetBlock: number) => {
    return new Promise((resolve) => {
        let currentBlock = 0;
        let seconds = 0;

        const interval = setInterval(async () => {
            if (seconds % 5 === 0) {
                (async () => {
                    currentBlock = await node.getBlockNumber();
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