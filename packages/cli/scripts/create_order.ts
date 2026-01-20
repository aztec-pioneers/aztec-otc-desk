import "dotenv/config";
import {
    deployEscrowContract,
    depositToEscrow,
    getTokenContract,
} from "@aztec-otc-desk/contracts/contract";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import {
    eth as ethDeployment,
    usdc as usdcDeployment
} from "./data/deployments.json"
import {
    createOrder,
    ETH_SWAP_AMOUNT,
    getOTCAccounts,
    USDC_SWAP_AMOUNT,
    getTestnetSendWaitOptions
} from "./utils";
import { createAztecNodeClient } from "@aztec/aztec.js/node";

// get environment variables
const { L2_NODE_URL, API_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}
if (!API_URL) {
    throw new Error("API_URL is not defined");
}

const main = async () => {
    // get accounts
    const node = await createAztecNodeClient(L2_NODE_URL);
    const { wallet, sellerAddress } = await getOTCAccounts(node);

    // get tokens
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(wallet, sellerAddress, node, ethAddress);
    //// NOTE: need to get usdc token too to make sure PXE knows it exists
    ////       but we don't need to do anything with it
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    await getTokenContract(wallet, sellerAddress, node, usdcAddress);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(node, wallet, sellerAddress);

    // build deploy
    const {
        contract: escrowContract,
        instance: escrowContractInstance,
        secretKey 
    } = await deployEscrowContract(
        wallet,
        sellerAddress,
        ethAddress,
        ETH_SWAP_AMOUNT,
        usdcAddress,
        USDC_SWAP_AMOUNT,
        opts
    );

    console.log(`Escrow contract deployed, address: ${escrowContract.address}, secret key: ${secretKey}`);

    console.log("Depositing eth to escrow");
    const receipt = await depositToEscrow(
        wallet,
        sellerAddress,
        escrowContract,
        eth,
        ETH_SWAP_AMOUNT,
        opts
    );
    console.log("1 ETH deposited to escrow, transaction hash: ", receipt.hash);

    // update api to add order
    await createOrder(
        escrowContract.address,
        escrowContractInstance,
        secretKey,
        eth.address,
        ETH_SWAP_AMOUNT,
        AztecAddress.fromString(usdcDeployment.address),
        USDC_SWAP_AMOUNT,
        API_URL
    )
}

main();
