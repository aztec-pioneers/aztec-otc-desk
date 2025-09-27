import { AztecAddress, TxReceipt, type Wallet } from "@aztec/aztec.js";
import { TOKENS, MINTER_ACCOUNT } from "../data/tokens";
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
    const contract = await TokenContract.at(AztecAddress.fromString(tokenAddress), wallet);
    const address = AztecAddress.fromString(activeAccount);
    return await contract.methods.balance_of_private(address).simulate({ from: address });
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