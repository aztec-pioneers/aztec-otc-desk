import "dotenv/config";
import {
    createPXE,
    deployEscrowContract,
    depositToEscrow,
    getTokenContract,
} from "@aztec-otc-desk/contracts";
import { AztecAddress } from "@aztec/aztec.js";
import {
    eth as ethDeployment,
    usdc as usdcDeployment
} from "./data/deployments.json"
import {
    createOrder,
    ethMintAmount,
    getOTCAccounts,
    usdcMintAmount,
    getTestnetSendWaitOptions
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

    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // get tokens
    const ethAddress = AztecAddress.fromString(ethDeployment.address);
    const eth = await getTokenContract(pxe, seller, ethAddress, L2_NODE_URL);
    //// NOTE: need to get usdc token too to make sure PXE knows it exists
    ////       but we don't need to do anything with it
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    await getTokenContract(pxe, seller, usdcAddress, L2_NODE_URL);

    // if testnet, get send/ wait opts optimized for waiting and high gas
    const opts = await getTestnetSendWaitOptions(pxe, true);

    // build deploy
    const { contract: escrowContract, secretKey } = await deployEscrowContract(pxe,
        seller,
        eth.address,
        ethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount,
        opts
    );

    console.log("Escrow contract deployed, address: ", escrowContract.address);
    console.log("Escrow contract secret key: ", secretKey);

    console.log("Depositing eth to escrow");
    const receipt = await depositToEscrow(
        escrowContract,
        seller,
        eth,
        ethMintAmount,
        opts
    );
    console.log("Eth deposited to escrow, transaction hash: ", receipt.hash);

    // update api to add order
    await createOrder(
        escrowContract.address,
        escrowContract.instance,
        secretKey,
        (await escrowContract.partialAddress),
        eth.address,
        ethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount,
        API_URL
    )
}

main();
