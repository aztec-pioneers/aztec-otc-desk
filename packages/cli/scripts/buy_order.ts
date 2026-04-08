import "dotenv/config";
import { fillOTCOrder, getTokenContract } from "@aztec-otc-desk/contracts/contract";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js/addresses";
import {
    closeOrder,
    escrowInstanceFromOrder,
    getOrders,
    getOTCAccounts,
    getTestnetSendWaitOptions,
    USDC_SWAP_AMOUNT
} from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import type { PXEConfig } from "@aztec/pxe/config";
import { isTestnet } from "@aztec-otc-desk/contracts/utils";

// get environment variables
const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}
if (!API_URL) {
    throw new Error("API_URL is not defined");
}

const main = async () => {
    // fetch orders
    const orders = await getOrders(API_URL);
    //// NOTE: should add dynamic order selection
    //// also need to make it not need !
    const orderToFill = orders[0]!;
    console.log("Found a matching order to fill");

    // get accounts
    const node = await createAztecNodeClient(L2_NODE_URL);
    let pxeConfig: Partial<PXEConfig> = {};
    if (await isTestnet(node)) pxeConfig = { proverEnabled: true };

    // get seller account
    const { wallet, buyerAddress } = await getOTCAccounts(node, pxeConfig);

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, buyerAddress, node, usdcAddress);

    // register ETH token
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    await getTokenContract(wallet, buyerAddress, node, ethAddress);

    // register escrow contract and account then get deployed instance
    const escrow = await escrowInstanceFromOrder(wallet, buyerAddress, orderToFill);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, buyerAddress);

    // fill the otc order — add escrow to scopes so buyer can read escrow's config note
    opts.send = { ...opts.send, additionalScopes: [escrow.address] };
    console.log("Attempting to fill order");
    const txHash = await fillOTCOrder(
        wallet,
        buyerAddress,
        escrow,
        usdc,
        USDC_SWAP_AMOUNT,
        opts
    );
    console.log("Filled OTC order with txHash: ", txHash.hash.toString());

    // remove the order from the OTC service so it isn't reused
    await closeOrder(orderToFill.orderId, API_URL);
}

main().then(() => process.exit(0));
