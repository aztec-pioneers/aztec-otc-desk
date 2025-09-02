import { getInitialTestAccounts, getInitialTestAccountsManagers, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXE, deployEscrowContract, deployTokenContractWithMinter, depositToEscrow, fillOTCOrder, TOKEN_METADATA } from "../../contracts/ts/test/utils";
import { eth as ethDeployment, usdc as usdcDeployment } from "../deployments.json"
import { TokenContract, TokenContractArtifact } from "../../contracts/artifacts/Token"
import { OTCEscrowContractContract, OTCEscrowContractContractArtifact } from "../../contracts/artifacts/OTCEscrowContract"
import { AztecAddress, createAztecNodeClient, Fr } from "@aztec/aztec.js";
import { ethMintAmount, usdcMintAmount } from "./utils";
import { ContractInstanceSchema, ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import type { Order } from "../../orderflow-service/src/types/api"

const API_URL = "http://localhost:3000";
type OrderResponse = { success: boolean, message: string, data: Order[] };
const main = async () => {

    // get an order from the database
    // do this first to fail if no order found
    let orders: Order[];
    try {
        const fullURL = `${API_URL}/order`
            + `?buy_token_address=${usdcDeployment.address}`
            + `&sell_token_address=${ethDeployment.address}`;
        const res = await fetch(fullURL, { method: "GET" });
        if (!res.ok) {
            throw new Error("Failed to fetch orders");
        }
        try {
            const data: OrderResponse = await res.json() as OrderResponse;
            orders = data.data;
        } catch (err) {
            throw new Error("Error parsing orders from API: " + (err as Error).message);
        }
    } catch (err) {
        throw new Error("Error fetching orders: " + (err as Error).message);
    }

    if (!orders || orders.length === 0) {
        throw new Error("No orders found");
    }

    console.log("Orders fetched: ", orders);
    // NOTE: should add dynamic order selection
    // also need to make it not need !
    const orderToFill = orders[0]!;

    // setup PXE
    const node = createAztecNodeClient("http://localhost:8080");
    const pxe = await createPXE(1);

    const wallets = await Promise.all((await getInitialTestAccountsManagers(pxe)).map(m => m.register()));

    const seller = wallets[0];
    if (!seller) {
        throw new Error("Seller not found");
    }
    await pxe.registerSender((seller.getAddress()));

    const buyer = wallets[1];
    if (!buyer) {
        throw new Error("Buyer not found");
    }

    // instantiate token contracts
    const usdcContractInstance = await node.getContract(AztecAddress.fromString(usdcDeployment.address));
    if (!usdcContractInstance) {
        throw new Error("USDC contract instance not found");
    }

    const ethContractInstance = await node.getContract(AztecAddress.fromString(ethDeployment.address));
    if (!ethContractInstance) {
        throw new Error("ETH contract instance not found");
    }
    await pxe.registerContract({ instance: usdcContractInstance, artifact: TokenContractArtifact });
    await pxe.registerContract({ instance: ethContractInstance, artifact: TokenContractArtifact });

    // Sync token states
    const usdc = await TokenContract.at(AztecAddress.fromString(usdcDeployment.address), buyer);
    await usdc.methods.sync_private_state().simulate();

    const eth = await TokenContract.at(AztecAddress.fromString(ethDeployment.address), buyer);
    await eth.methods.sync_private_state().simulate();

    console.log("USDC balance of buyer: ", await usdc.methods.balance_of_private(buyer.getAddress()).simulate());

    // register escrow contract and account then get deployed instance
    const escrowContractInstance = ContractInstanceWithAddressSchema.parse(
        JSON.parse(orderToFill!.contractInstance)
    );
    await pxe.registerContract({ instance: escrowContractInstance, artifact: OTCEscrowContractContractArtifact });
    const escrowSecretKey = Fr.fromString(orderToFill!.secretKey);
    const escrowPartialAddress = Fr.fromString(orderToFill!.partialAddress);
    await pxe.registerAccount(escrowSecretKey, escrowPartialAddress);
    const escrowAddress = AztecAddress.fromString(orderToFill.escrowAddress);
    const escrow = await OTCEscrowContractContract.at(escrowAddress, buyer);
    await escrow.withWallet(buyer).methods.sync_private_state().simulate();
    // fill the otc order
    const txHash = await fillOTCOrder(escrow, buyer, usdc, usdcMintAmount);

    console.log("Eth balance of buyer: ", await eth.methods.balance_of_private(buyer.getAddress()).simulate());
    console.log("USDC balance of seller: ", await usdc.methods.balance_of_private(seller.getAddress()).simulate());

    // remove the order from the OTC service so it isn't reused

    try {
        const fullURL = `${API_URL}/order?id=${orderToFill.orderId}`;
        const res = await fetch(fullURL, { method: "DELETE" });
        if (!res.ok) {
            throw new Error("Unknown error closing filled order");
        }
        console.log("Order closed in OTC order service")
    } catch (err) {
        throw new Error("Error closing order: " + (err as Error).message);
    }

}

main();
