import "dotenv/config";
import { wethMintAmount, getOTCAccounts, usdcMintAmount } from "./utils";
import { weth as wethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
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

    // get WETH token
    const wethAddress = AztecAddress.fromString(wethDeployment.address);
    const weth = await getTokenContract(pxe, seller, wethAddress, L2_NODE_URL);


    // mint WETH
    console.log("Minting WETH to seller account");
    await weth
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), seller.getAddress(), wethMintAmount * 10n)
        .send().wait({ timeout: 3600 });
    console.log("10 WETH minted to seller");

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, seller, usdcAddress, L2_NODE_URL);

    console.log("Minting USDC to buyer account");
    await usdc
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), buyer.getAddress(), usdcMintAmount * 10n)
        .send().wait({ timeout: 3600 });
    console.log("50,000 USDC minted to buyer");
}

main();
