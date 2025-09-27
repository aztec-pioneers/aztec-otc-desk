import { AztecAddress, type ContractInstanceWithAddress, Fr } from "@aztec/aztec.js";
import { OTC_DESK_API_URL } from "../constants"

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
            throw new Error("Failed to fetch health status");
        }
        console.log("Order added to otc order service")
    } catch (err) {
        throw new Error("Error creating order: " + (err as Error).message);
    }
}