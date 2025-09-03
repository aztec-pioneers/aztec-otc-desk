import "dotenv/config";
import {
    AccountWalletWithSecretKey,
    AztecAddress,
    type ContractInstanceWithAddress,
    Fr,
    type PXE,
} from "@aztec/aztec.js";
import { ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import { OTCEscrowContract, getEscrowContract, isTestnet } from "@aztec-otc-desk/contracts";
import type { Order } from "../../../orderflow-service/src/types/api";
import {
    weth as wethDeployment,
    usdc as usdcDeployment
} from "../data/deployments.json"
import type { OrderAPIResponse } from "./types";

const { API_URL } = process.env;

if (!API_URL) {
    throw new Error("API_URL is not defined");
}

/**
 * Fetch orders from the API
 * 
 * @returns Open orders fetched from the API
 */
export const getOrders = async (): Promise<Order[]> => {
    // get an order from the database
    // do this first to fail if no order found
    let orders: Order[];
    try {
        const fullURL = `${API_URL}/order`
            + `?buy_token_address=${usdcDeployment.address}`
            + `&sell_token_address=${wethDeployment.address}`;
        const res = await fetch(fullURL, { method: "GET" });
        if (!res.ok) {
            throw new Error("Failed to fetch orders");
        }
        try {
            const data: OrderAPIResponse = await res.json() as OrderAPIResponse;
            orders = data.data;
        } catch (err) {
            throw new Error("Error parsing orders from API: " + (err as Error).message);
        }
    } catch (err) {
        throw new Error("Error fetching orders: " + (err as Error).message);
    }

    if (orders.length === 0) {
        throw new Error("No orders found");
    }

    return orders;
}

/**
 * Create a new order
 * @param escrowAddress The address of the escrow contract
 * @param contractInstance The contract instance to use
 * @param secretKey The secret key to use
 * @param partialaAddress The partial address to use
 * @param sellTokenAddress The address of the token to sell
 * @param sellTokenAmount The amount of the token to sell
 * @param buyTokenAddress The address of the token to buy
 * @param buyTokenAmount The amount of the token to buy
 */
export const createOrder = async (
    escrowAddress: AztecAddress | string,
    contractInstance: ContractInstanceWithAddress,
    secretKey: Fr,
    partialaAddress: Fr,
    sellTokenAddress: AztecAddress | string,
    sellTokenAmount: bigint,
    buyTokenAddress: AztecAddress | string,
    buyTokenAmount: bigint
) => {
    // parse inputs
    if (typeof escrowAddress === "string") {
        escrowAddress = AztecAddress.fromString(escrowAddress);
    }
    if (typeof partialaAddress === "string") {
        partialaAddress = Fr.fromString(partialaAddress);
    }
    if (typeof sellTokenAddress === "string") {
        sellTokenAddress = AztecAddress.fromString(sellTokenAddress);
    }
    if (typeof buyTokenAddress === "string") {
        buyTokenAddress = AztecAddress.fromString(buyTokenAddress);
    }
    // build the request body
    const payload = {
        escrowAddress: escrowAddress.toString(),
        contractInstance: JSON.stringify(contractInstance),
        secretKey: secretKey.toString(),
        partialAddress: partialaAddress.toString(),
        sellTokenAddress: sellTokenAddress.toString(),
        sellTokenAmount: sellTokenAmount.toString(),
        buyTokenAddress: buyTokenAddress.toString(),
        buyTokenAmount: buyTokenAmount.toString()
    }
    // post request to add order to api
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

/**
 * Close an order once filled using the ID
 * @param id The ID of the order to close
 */
export const closeOrder = async (id: string) => {
    try {
        const fullURL = `${API_URL}/order?id=${id}`;
        const res = await fetch(fullURL, { method: "DELETE" });
        if (!res.ok) {
            throw new Error("Unknown error closing filled order");
        }
        console.log("Order closed in OTC order service")
    } catch (err) {
        throw new Error("Error closing order: " + (err as Error).message);
    }
}

export const escrowInstanceFromOrder = async (
    pxe: PXE,
    caller: AccountWalletWithSecretKey,
    order: Order,
): Promise<OTCEscrowContract> => {
    const escrowContractInstance = ContractInstanceWithAddressSchema.parse(
        JSON.parse(order.contractInstance)
    );
    const escrowSecretKey = Fr.fromString(order.secretKey);
    const escrowPartialAddress = Fr.fromString(order.partialAddress);
    const escrowAddress = AztecAddress.fromString(order.escrowAddress);
    return await getEscrowContract(
        pxe,
        caller,
        escrowAddress,
        escrowContractInstance,
        escrowSecretKey,
        escrowPartialAddress
    );
}