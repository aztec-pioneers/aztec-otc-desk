import "dotenv/config";
import { ethMintAmount, getOTCAccounts, usdcMintAmount, getFeeSendOptions } from "./utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js";
import { createPXE, getTokenContract } from "@aztec-otc-desk/contracts";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}

// - Mints 1 Eth to Buyer of the OTC
// - Mints 5000 USDC to Buyer of the OTC
const main = async () => {
    const pxe = await createPXE();

    // get accounts
    const { seller, buyer } = await getOTCAccounts(pxe);

    // get eth token
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(pxe, seller, ethAddress, L2_NODE_URL);

    // if testnet, send with high gas fee allowance and sponsored fpc
    const sendOptions = await getFeeSendOptions(pxe, true);

    // mint eth
    console.log("Minting eth to seller account");
    await eth
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), seller.getAddress(), ethMintAmount * 10n)
        .send(sendOptions)
        .wait({ timeout: 3600 });
    console.log("10 eth minted to seller");

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, seller, usdcAddress, L2_NODE_URL);

    console.log("Minting USDC to buyer account");
    await usdc
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), buyer.getAddress(), usdcMintAmount * 10n)
        .send(sendOptions)
        .wait({ timeout: 3600 });
    console.log("50,000 USDC minted to buyer");
}

main();
