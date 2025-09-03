import "dotenv/config";
import { createPXE, fillOTCOrder, getTokenContract } from "@aztec-otc-desk/contracts";
import { weth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js";
import {
    closeOrder,
    escrowInstanceFromOrder,
    getFeeSendOptions,
    getOrders,
    getOTCAccounts,
    usdcMintAmount
} from "./utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}

const main = async () => {
    // fetch orders
    const orders = await getOrders();
    //// NOTE: should add dynamic order selection
    //// also need to make it not need !
    const orderToFill = orders[0]!;
    console.log("Found a matching order to fill");

    // setup PXE
    const pxe = await createPXE(1);
    const { buyer } = await getOTCAccounts(pxe);

    // instantiate token contracts
    const wethAddress = AztecAddress.fromString(ethDeployment.address);
    const weth = await getTokenContract(pxe, buyer, wethAddress, L2_NODE_URL);
    await weth.methods.sync_private_state().simulate();

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, buyer, usdcAddress, L2_NODE_URL);
    await usdc.methods.sync_private_state().simulate();

    // register escrow contract and account then get deployed instance
    const escrow = await escrowInstanceFromOrder(pxe, buyer, orderToFill);

    // if testnet, send with high gas fee allowance and sponsored fpc
    const sendOptions = await getFeeSendOptions(pxe, true);

    // fill the otc order
    console.log("Attempting to fill order");
    const txHash = await fillOTCOrder(escrow, buyer, usdc, usdcMintAmount, sendOptions);
    console.log("Filled OTC order with txHash: ", txHash);

    // remove the order from the OTC service so it isn't reused
    await closeOrder(orderToFill.orderId);
}

main();
