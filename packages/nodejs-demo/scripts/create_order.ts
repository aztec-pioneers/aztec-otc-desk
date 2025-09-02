import { createPXE, deployEscrowContract, depositToEscrow } from "../../contracts/ts/test/utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "./data/deployments.json"
import { TokenContract } from "../../contracts/artifacts/Token"
import { AztecAddress } from "@aztec/aztec.js";
import { createOrder, ethMintAmount, getOTCAccounts, usdcMintAmount } from "./utils";

const main = async () => {

    const pxe = await createPXE();

    // get accounts
    const { seller } = await getOTCAccounts(pxe);

    const eth = await TokenContract.at(AztecAddress.fromString(ethDeployment.address), seller);

    const { contract: escrowContract, secretKey } = await deployEscrowContract(pxe,
        seller,
        eth.address,
        ethMintAmount,
        AztecAddress.fromString(usdcDeployment.address),
        usdcMintAmount,
    );

    console.log("Escrow contract deployed, address: ", escrowContract.address);
    console.log("Escrow contract secret key: ", secretKey);

    console.log("Depositing eth to escrow");
    const receipt = await depositToEscrow(escrowContract, seller, eth, ethMintAmount);
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
        usdcMintAmount
    )
}

main();
