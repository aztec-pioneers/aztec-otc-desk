import "dotenv/config";
import {
    createPXE,
    deployEscrowContract,
    depositToEscrow,
    getTokenContract,
    TokenContract
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
    usdcMintAmount
} from "./utils";

const { L1_RPC_URL } = process.env;
if (!L1_RPC_URL) {
    throw new Error("L1_RPC_URL is not defined");
}

const main = async () => {

    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    const wethAddress = AztecAddress.fromString(wethDeployment.address);
    const weth = await getTokenContract(pxe, seller, wethAddress, L1_RPC_URL);

    const { contract: escrowContract, secretKey } = await deployEscrowContract(pxe,
        seller,
        weth.address,
        wethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount,
    );

    console.log("Escrow contract deployed, address: ", escrowContract.address);
    console.log("Escrow contract secret key: ", secretKey);

    console.log("Depositing eth to escrow");
    const receipt = await depositToEscrow(escrowContract, seller, weth, wethMintAmount);
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
