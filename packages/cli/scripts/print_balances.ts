import "dotenv/config";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { getTokenContract } from "@aztec-otc-desk/contracts/contract"
import { getOTCAccounts } from "./utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { isTestnet } from "@aztec-otc-desk/contracts/utils";
import { getFeeJuicePublicBalance } from "@aztec-otc-desk/contracts/fees";


const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}

// Get balances for users
const main = async () => {
    // Create PXE and FeeJuicePortalManager instances
    const node = await createAztecNodeClient(L2_NODE_URL);
    const { wallet, sellerAddress, buyerAddress } = await getOTCAccounts(node);

    // get tokens
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(wallet, sellerAddress, node, ethAddress);

    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(wallet, sellerAddress, node, usdcAddress);

    // check balances for seller
    const sellerETHBalance = await eth
        .withWallet(wallet)
        .methods
        .balance_of_private(sellerAddress)
        .simulate({ from: sellerAddress });
    const sellerUSDCBalance = await usdc
        .withWallet(wallet)
        .methods
        .balance_of_private(sellerAddress)
        .simulate({ from: sellerAddress });
    
    // add tokens to buyer wallet
    await wallet.registerContract(eth);
    await eth
        .withWallet(wallet)
        .methods
        .sync_private_state();
    await wallet.registerContract(usdc);
    await usdc
        .withWallet(wallet)
        .methods
        .sync_private_state();
    const buyerETHBalance = await eth
        .withWallet(wallet)
        .methods
        .balance_of_private(buyerAddress)
        .simulate({ from: buyerAddress });
    const buyerUSDCBalance = await usdc
        .withWallet(wallet)
        .methods
        .balance_of_private(buyerAddress)
        .simulate({ from: buyerAddress });

    console.log("==================[Balances]==================")
    console.log(`ETH balance for seller: ${sellerETHBalance}`);
    console.log(`USDC balance for seller: ${sellerUSDCBalance}`);
    console.log(`ETH balance for buyer: ${buyerETHBalance}`);
    console.log(`USDC balance for buyer: ${buyerUSDCBalance}`);
    console.log("==============================================");
}

main();
