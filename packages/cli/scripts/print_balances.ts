import "dotenv/config";
import { AztecAddress } from "@aztec/aztec.js";
import {
    createPXE,
    getTokenContract,
    isTestnet,
    getFeeJuicePublicBalance
} from "@aztec-otc-desk/contracts"
import { getOTCAccounts } from "./utils";
import { weth as wethDeployment, usdc as usdcDeployment } from "./data/deployments.json"



const {
    MNEMONIC,
    L1_RPC_URL,
    L2_NODE_URL
} = process.env;


// Get balances for users
const main = async () => {
    // Create PXE and FeeJuicePortalManager instances
    const pxe = await createPXE();
    const { seller, buyer } = await getOTCAccounts(pxe)
    

    // get tokens
    const wethAddress = AztecAddress.fromString(wethDeployment.address);
    const weth = await getTokenContract(pxe, seller, wethAddress, L1_RPC_URL);

    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    const usdc = await getTokenContract(pxe, seller, usdcAddress, L1_RPC_URL);

    // check balances for seller
    const sellerWETHBalance = await weth
        .withWallet(seller)
        .methods
        .balance_of_private(seller.getAddress())
        .simulate();
    const sellerUSDCBalance = await usdc
        .withWallet(seller)
        .methods
        .balance_of_private(seller.getAddress())
        .simulate();
    
    // check balances for buyer
    await weth
        .withWallet(buyer)
        .methods
        .sync_private_state();
    await usdc
        .withWallet(buyer)
        .methods
        .sync_private_state();
    const buyerWETHBalance = await weth
        .withWallet(buyer)
        .methods
        .balance_of_private(buyer.getAddress())
        .simulate();
    const buyerUSDCBalance = await usdc
        .withWallet(buyer)
        .methods
        .balance_of_private(buyer.getAddress())
        .simulate();

    // if testnet, check available funds
    if (await isTestnet(pxe)) {
        // todo: WE NEED TO SHIELD FEE PAYING
        const feeJuiceBalanceSeller = await getFeeJuicePublicBalance(pxe, seller.getAddress());
        const feeJuiceBalanceBuyer = await getFeeJuicePublicBalance(pxe, buyer.getAddress());
        console.log(`FeeJuice balance for seller: ${feeJuiceBalanceSeller}`);
        console.log(`FeeJuice balance for buyer: ${feeJuiceBalanceBuyer}`);
    }
    console.log(`WETH balance for seller: ${sellerWETHBalance}`);
    console.log(`USDC balance for seller: ${sellerUSDCBalance}`);
    console.log(`WETH balance for buyer: ${buyerWETHBalance}`);
    console.log(`USDC balance for buyer: ${buyerUSDCBalance}`);
}

main();
