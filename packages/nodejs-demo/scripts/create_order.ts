import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXE, deployEscrowContract, depositToEscrow } from "../../contracts/ts/test/utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "../deployments.json"
import { TokenContract } from "../../contracts/artifacts/Token"
import { AztecAddress } from "@aztec/aztec.js";
import { ethMintAmount, usdcMintAmount } from "./utils";

const API_URL = "http://localhost:3000";

const main = async () => {
    
    const pxe = await createPXE();
    const wallets = await getInitialTestAccountsWallets(pxe);

    const seller = wallets[0];
    if (!seller) {
        throw new Error("Seller not found");
    }

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


    // update api
    /// build the requesy body
    const payload = {
        escrowAddress: escrowContract.address.toString(),
        contractInstance: JSON.stringify(escrowContract.instance),
        secretKey: secretKey.toString(),
        partialAddress: (await escrowContract.partialAddress).toString(),
        sellTokenAddress: eth.address.toString(),
        sellTokenAmount: ethMintAmount.toString(),
        buyTokenAddress: AztecAddress.fromString(usdcDeployment.address).toString(),
        buyTokenAmount: usdcMintAmount.toString()
    }
    try {
        const fullURL = `${API_URL}/order`;
        const res = await fetch(fullURL,
            { method: "POST", body: JSON.stringify(payload) }
        );
        if (!res.ok) {
            throw new Error("Failed to fetch health status");
        }
        console.log("Order added to otc order service")
    } catch (err) {
        throw new Error("Error creating order: " + (err as Error).message);
    }
}

main();
