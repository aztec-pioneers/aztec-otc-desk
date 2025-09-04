import "dotenv/config";
import { createPXE, fillOTCOrder, getTokenContract } from "@aztec-otc-desk/contracts";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js";
import {
    closeOrder,
    escrowInstanceFromOrder,
    getOrders,
    getOTCAccounts,
    getTestnetSendWaitOptions,
    usdcMintAmount
} from "./utils";

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

    // setup PXE
    const pxe = await createPXE(1);
    const { buyer } = await getOTCAccounts(pxe);

    // instantiate token contracts
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(pxe, buyer, ethAddress, L2_NODE_URL);
    await eth.methods.sync_private_state().simulate();

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, buyer, usdcAddress, L2_NODE_URL);
    await usdc.methods.sync_private_state().simulate();

    // register escrow contract and account then get deployed instance
    const escrow = await escrowInstanceFromOrder(pxe, buyer, orderToFill);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(pxe, true);

    // fill the otc order
    console.log("Attempting to fill order");
    const txHash = await fillOTCOrder(escrow, buyer, usdc, usdcMintAmount, opts);
    console.log("Filled OTC order with txHash: ", txHash);

    // remove the order from the OTC service so it isn't reused
    await closeOrder(orderToFill.orderId, API_URL);
}

main();
