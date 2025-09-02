import { createPXE } from "../../contracts/ts/test/utils/index"
import { ethMintAmount, getOTCAccounts, usdcMintAmount } from "./utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { AztecAddress } from "@aztec/aztec.js";
import { getTokenContract } from "./utils/contracts";

// - Mints 1 Eth to Buyer of the OTC
// - Mints 5000 USDC to Buyer of the OTC
const main = async () => {
    const pxe = await createPXE();

    // get accounts
    const { seller, buyer } = await getOTCAccounts(pxe);

    // get WETH token
    const wethAddress = AztecAddress.fromString(ethDeployment.address);
    const weth = await getTokenContract(pxe, wethAddress, seller);

    // mint WETH
    console.log("Minting WETH to seller account");
    await weth
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), seller.getAddress(), ethMintAmount * 10n)
        .send().wait({ timeout: 3600 });
    console.log("10 WETH minted to seller");

    // get USDC token
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, usdcAddress, seller);

    console.log("Minting USDC to buyer account");
    await usdc
        .withWallet(seller)
        .methods
        .mint_to_private(seller.getAddress(), buyer.getAddress(), usdcMintAmount * 10n)
        .send().wait({ timeout: 3600 });
    console.log("50,000 USDC minted to buyer");
}

main();
