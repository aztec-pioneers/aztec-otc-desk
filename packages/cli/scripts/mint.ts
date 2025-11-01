import "dotenv/config";
import {
    ETH_MINT_AMOUNT,
    getOTCAccounts,
    USDC_MINT_AMOUNT,
    getTestnetSendWaitOptions
} from "./utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { getTokenContract } from "@aztec-otc-desk/contracts/contract";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@aztec-otc-desk/contracts/utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) throw new Error("L2_NODE_URL not set in env");

// - Mints 1 Eth to Buyer of the OTC
// - Mints 5000 USDC to Buyer of the OTC
const main = async () => {
    const node = createAztecNodeClient(L2_NODE_URL);

    // get accounts
    let pxeConfig = {};
    if (await isTestnet(node)) pxeConfig = { rollupVersion: 1667575857, proverEnabled: false };
    const { wallet, sellerAddress, buyerAddress } = await getOTCAccounts(node, pxeConfig);

    // get eth token
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(wallet, sellerAddress, node, ethAddress);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, sellerAddress);

    // mint eth
    console.log("Minting eth to seller account");
    await eth
        .withWallet(wallet)
        .methods
        .mint_to_private(sellerAddress, ETH_MINT_AMOUNT)
        .send(opts.send)
        .wait(opts.wait);
    console.log("10 eth minted to seller");

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, sellerAddress, node, usdcAddress);

    console.log("Minting USDC to buyer account");
    await usdc
        .withWallet(wallet)
        .methods
        .mint_to_private(buyerAddress, USDC_MINT_AMOUNT)
        .send(opts.send)
        .wait(opts.wait);
    console.log("50,000 USDC minted to buyer");
}

main();
