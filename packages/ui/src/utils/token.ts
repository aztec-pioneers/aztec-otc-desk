import { AuthWitness, AztecAddress, Fr, TxReceipt, type Wallet } from "@aztec/aztec.js";
import { TOKENS, MINTER_ACCOUNT } from "../constants/tokens";
import { TokenContract } from "@aztec/noir-contracts.js/Token";

export const fetchTokenBalance = async (
    symbol: string,
    wallet: Wallet,
    activeAccount: string,
): Promise<bigint> => {
    const tokenAddress = TOKENS.find(t => t.symbol === symbol)?.address;
    if (!tokenAddress) {
        throw new Error(`Token with symbol ${symbol} not found`);
    }
    console.log("Fetching balance for token at address:", tokenAddress);
    const contract = await TokenContract.at(AztecAddress.fromString(tokenAddress), wallet);
    console.log("got instance")
    const address = AztecAddress.fromString(activeAccount);
    console.log("got address")
    let x;
    try {
        x = await contract.methods.balance_of_private(address).simulate({ from: address });
    } catch (error) {
        console.error("Error fetching token balance:", error);
        throw new Error(`Failed to fetch token balance for ${symbol}`);
    }
    return x;
}

export const mintTokens = async (
    symbol: string,
    amount: bigint,
    wallet: Wallet,
    activeAccount: string,
): Promise<TxReceipt> => {
    const tokenAddress = TOKENS.find(t => t.symbol === symbol)?.address;
    if (!tokenAddress) {
        throw new Error(`Token with symbol ${symbol} not found`);
    }
    const contract = await TokenContract.at(AztecAddress.fromString(tokenAddress), wallet);
    
    const address = AztecAddress.fromString(activeAccount);
    return await contract
        .withWallet(wallet)
        .methods
        .mint_to_private(address, amount)
        .send({ from: MINTER_ACCOUNT.address })
        .wait();
}

export const privateTransferAuthwit = async (
    wallet: Wallet,
    activeAccount: string,
    symbol: string,
    amount: bigint,
    escrow: string,
): Promise<{ authwit: AuthWitness, nonce: Fr }> => {
    // get the token
    const tokenAddress = TOKENS.find(t => t.symbol === symbol)?.address;
    if (!tokenAddress) {
        throw new Error(`Token with symbol ${symbol} not found`);
    }
    const token = await TokenContract.at(AztecAddress.fromString(tokenAddress), wallet);

    // build call
    const activeAddress = AztecAddress.fromString(activeAccount);
    const escrowAddress = AztecAddress.fromString(escrow);
    const nonce = Fr.random();
    const call = await token.withWallet(wallet).methods.transfer_in_private(
        activeAddress,
        escrowAddress,
        amount,
        nonce,
    ).getFunctionCall();
    const authwit = await wallet.createAuthWit(activeAddress, { caller: escrowAddress, call });
    return { authwit, nonce }
}