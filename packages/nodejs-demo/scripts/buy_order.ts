import { getInitialTestAccounts, getInitialTestAccountsManagers, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXE, deployEscrowContract, deployTokenContractWithMinter, depositToEscrow, fillOTCOrder, TOKEN_METADATA } from "../../contracts/ts/test/utils";
import {eth as ethDeployment, usdc as usdcDeployment, escrow as escrowDeployment} from "../deployments.json"
import {TokenContract, TokenContractArtifact} from "../../contracts/artifacts/Token"
import {OTCEscrowContractContract, OTCEscrowContractContractArtifact} from "../../contracts/artifacts/OTCEscrowContract"
import { AztecAddress, createAztecNodeClient, Fr } from "@aztec/aztec.js";
import { ethMintAmount, usdcMintAmount } from "./utils";
import { ContractInstanceSchema, ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";

const main = async () => {

    const node = createAztecNodeClient("http://localhost:8080");
    const pxe = await createPXE(1);

    const wallets  = await Promise.all((await getInitialTestAccountsManagers(pxe)).map(m => m.register()));

    const seller = wallets[0];
    if(!seller) {
        throw new Error("Seller not found");
    }
    await pxe.registerSender((seller.getAddress()));

    const buyer = wallets[1];
    if(!buyer) {
        throw new Error("Buyer not found");
    }

    const usdcContractInstance = await node.getContract(AztecAddress.fromString(usdcDeployment.address));
    if(!usdcContractInstance) {
        throw new Error("USDC contract instance not found");
    }

    const ethContractInstance = await node.getContract(AztecAddress.fromString(ethDeployment.address));
    if(!ethContractInstance) {
        throw new Error("ETH contract instance not found");
    }

    await pxe.registerContract({instance: usdcContractInstance, artifact: TokenContractArtifact});
    await pxe.registerContract({instance: ethContractInstance, artifact: TokenContractArtifact});


   const escrowContractInstance = ContractInstanceWithAddressSchema.parse(escrowDeployment.instance);
   await pxe.registerContract({instance: escrowContractInstance, artifact: OTCEscrowContractContractArtifact});
   await pxe.registerAccount(Fr.fromString(escrowDeployment.secretKey), Fr.fromString(escrowDeployment.partialAddress));

    // const accountContractInstance = await node.getContract(buyer.getAddress());
    // if(!accountContractInstance) {
    //     throw new Error("Account contract instance not found");
    // }

    // await pxe.registerAccount(buyer.getSecretKey(), buyer.getCompleteAddress().partialAddress);
    // await pxe.registerContract({instance: accountContractInstance});

    const usdc = await TokenContract.at(AztecAddress.fromString(usdcDeployment.address), buyer);
    await usdc.methods.sync_private_state().simulate();
    
    const eth = await TokenContract.at(AztecAddress.fromString(ethDeployment.address), buyer);
    await eth.methods.sync_private_state().simulate();

    console.log("USDC balance of buyer: ", await usdc.methods.balance_of_private(buyer.getAddress()).simulate());

    const escrow = await OTCEscrowContractContract.at(AztecAddress.fromString(escrowDeployment.address), buyer);
    await escrow.withWallet(buyer).methods.sync_private_state().simulate();

    const txHash = await fillOTCOrder(escrow, buyer, usdc, usdcMintAmount);
    console.log("Order filled, transaction hash: ", txHash);

    console.log("Eth balance of buyer: ", await eth.methods.balance_of_private(buyer.getAddress()).simulate());
    console.log("USDC balance of seller: ", await usdc.methods.balance_of_private(seller.getAddress()).simulate());

    // const receipt = await pxe.getTxReceipt(txHash);
    // console.log("Order filled, receipt: ", receipt);


}

main();
