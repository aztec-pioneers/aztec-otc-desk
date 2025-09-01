import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXE, deployEscrowContract, depositToEscrow } from "../../contracts/ts/test/utils";
import {eth as ethDeployment, usdc as usdcDeployment} from "../deployments.json"
import {TokenContract} from "../../contracts/artifacts/Token"
import { AztecAddress } from "@aztec/aztec.js";
import { ethMintAmount, usdcMintAmount } from "./utils";
import deployments from "../deployments.json"
import { writeFileSync } from "node:fs";

const main = async () => {

    const pxe = await createPXE();
    const wallets  = await getInitialTestAccountsWallets(pxe);

    const seller = wallets[0];
    if(!seller) {
        throw new Error("Seller not found");
    }

    const eth = await TokenContract.at(AztecAddress.fromString(ethDeployment.address), seller);

    const {contract : escrowContract, secretKey} =  await deployEscrowContract(pxe,
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

    console.log("eth balance of seller: ", await eth.methods.balance_of_private(seller.getAddress()).simulate());
    console.log("eth balance of escrow: ", await eth.methods.balance_of_private(escrowContract.address).simulate());

    const newDeployments = {
        ...deployments,
        escrow: {
            address: escrowContract.address,
            secretKey: secretKey,
            partialAddress: await escrowContract.partialAddress, 
            instance: escrowContract.instance
        }
    }

    writeFileSync("deployments.json", JSON.stringify(newDeployments, null, 2));
}

main();
