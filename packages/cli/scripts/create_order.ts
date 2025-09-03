import "dotenv/config";
import {
    createPXE,
    deployEscrowContract,
    depositToEscrow,
    getTokenContract,
} from "@aztec-otc-desk/contracts";
import { AztecAddress } from "@aztec/aztec.js";
import {
    weth as wethDeployment,
    usdc as usdcDeployment
} from "./data/deployments.json"
import {
    createOrder,
    wethMintAmount,
    getOTCAccounts,
    usdcMintAmount,
    getFeeSendOptions
} from "./utils";

const { L2_NODE_URL } = process.env;
if (!L2_NODE_URL) {
    throw new Error("L2_NODE_URL is not defined");
}

const main = async () => {

    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    // get tokens
    const wethAddress = AztecAddress.fromString(wethDeployment.address);
    const weth = await getTokenContract(pxe, seller, wethAddress, L2_NODE_URL);
    //// NOTE: need to get usdc token too to make sure PXE knows it exists
    ////       but we don't need to do anything with it
    const usdcAddress = AztecAddress.fromString(usdcDeployment.address);
    await getTokenContract(pxe, seller, usdcAddress, L2_NODE_URL);

    // if testnet, send with high gas fee allowance and sponsored fpc
    const sendOptions = await getFeeSendOptions(pxe, true);

    // build deploy
    const { contract: escrowContract, secretKey } = await deployEscrowContract(pxe,
        seller,
        weth.address,
        wethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount,
        sendOptions
    );

    console.log("Escrow contract deployed, address: ", escrowContract.address);
    console.log("Escrow contract secret key: ", secretKey);

    console.log("Depositing weth to escrow");
    const receipt = await depositToEscrow(
        escrowContract,
        seller,
        weth,
        wethMintAmount,
        sendOptions
    );
    console.log("Eth deposited to escrow, transaction hash: ", receipt.hash);

    // update api to add order
    await createOrder(
        escrowContract.address,
        escrowContract.instance,
        secretKey,
        (await escrowContract.partialAddress),
        weth.address,
        wethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount
    )
}

main();
