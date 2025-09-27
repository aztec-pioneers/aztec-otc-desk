import { AztecAddress, type ContractInstanceWithAddress, Fr, type Wallet } from "@aztec/aztec.js";
import { OTC_DESK_API_URL } from "../constants"


export type Order = {
    orderId: string;
    escrowAddress: string;
    contractInstance: string;
    secretKey: string;
    partialAddress: string;
    sellTokenAddress: string;
    sellTokenAmount: BigInt;
    buyTokenAddress: string;
    buyTokenAmount: BigInt;
}
export type OrderAPIResponse = { success: boolean, message: string, data: Order };


export const createOTCDeskOrder = async (
    escrowAddress: AztecAddress | string,
    contractInstance: ContractInstanceWithAddress,
    secretKey: Fr,
    partialaAddress: Fr,
    sellTokenAddress: AztecAddress | string,
    sellTokenAmount: bigint,
    buyTokenAddress: AztecAddress | string,
    buyTokenAmount: bigint,
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
        const fullURL = `${OTC_DESK_API_URL}/order`;
        const res = await fetch(fullURL,
            { method: "POST", body: JSON.stringify(payload) }
        );
        if (!res.ok) {
            throw new Error("Failed to post new order to otc order service");
        }
        console.log("Order added to otc order service")
    } catch (err) {
        throw new Error("Error creating order: " + (err as Error).message);
    }
}

export const requestOTCMatch = async (
    sellTokenAddress: AztecAddress | string,
    buyTokenAddress: AztecAddress | string,
    sellTokenMinAmount: bigint,
    sellTokeMaxAmount: bigint,
    buyTokenMinAmount: bigint,
    buyTokenMaxAmount: bigint,
): Promise<Order | null> => {
    // parse inputs
    if (typeof sellTokenAddress === "string") {
        sellTokenAddress = AztecAddress.fromString(sellTokenAddress);
    }
    if (typeof buyTokenAddress === "string") {
        buyTokenAddress = AztecAddress.fromString(buyTokenAddress);
    }
    // build the request body
    const payload = {
        sellToken: sellTokenAddress.toString(),
        buyToken: buyTokenAddress.toString(),
        sellTokenMinAmount: sellTokenMinAmount.toString(),
        sellTokenMaxAmount: sellTokeMaxAmount.toString(),
        buyTokenMinAmount: buyTokenMinAmount.toString(),
        buyTokenMaxAmount: buyTokenMaxAmount.toString()
    }
    // post request to add order to api
    try {
        const fullURL = `${OTC_DESK_API_URL}/order/match`;
        const res = await fetch(fullURL,
            { method: "POST", body: JSON.stringify(payload) }
        );
        if (!res.ok) {
            if (res.status === 404) return null; // no match found
            else throw new Error("Failed to match order with otc order service");
        }
        const data = await res.json() as OrderAPIResponse;
        // parse the order
        return data.data;
    } catch (err) {
        throw new Error("Error matching order: " + (err as Error).message);
    }
}


export const closeOrder = async (id: string) => {
    try {
        const fullURL = `${OTC_DESK_API_URL}/order?id=${id}`;
        const res = await fetch(fullURL, { method: "DELETE" });
        if (!res.ok) {
            throw new Error("Unknown error closing filled order");
        }
        console.log("Order closed in OTC order service")
    } catch (err) {
        throw new Error("Error closing order: " + (err as Error).message);
    }
}