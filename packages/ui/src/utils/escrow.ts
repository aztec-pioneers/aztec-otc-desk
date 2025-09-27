import { AztecAddress, deriveKeys, Fr, TxReceipt, type Wallet } from "@aztec/aztec.js";
import { OTCEscrowContract } from "@aztec-otc-desk/contracts";
import { computePartialAddress } from "@aztec/stdlib/contract";
import type { EmbeddedWallet } from "../wallet/embeddedWallet";
import { prepareForFeePayment } from "./sponsoredFPC";

export const deployEscrow = async (
    wallet: EmbeddedWallet,
    activeAccount: string,
    sellTokenAddress: string,
    sellTokenAmount: bigint,
    buyTokenAddress: string,
    buyTokenAmount: bigint,
): Promise<{ escrow: OTCEscrowContract, escrowSecretKey: Fr }> => {
    // get keys for contract
    const contractSecretKey = Fr.random();
    const contractPublicKeys = (await deriveKeys(contractSecretKey)).publicKeys;

    // set up contract deployment tx
    const contractDeployment = await OTCEscrowContract.deployWithPublicKeys(
        contractPublicKeys,
        wallet,
        AztecAddress.fromString(sellTokenAddress),
        sellTokenAmount,
        AztecAddress.fromString(buyTokenAddress),
        buyTokenAmount
    );

    // add contract decryption keys to PXE
    const partialAddress = await computePartialAddress(
        await contractDeployment.getInstance(),
    );
    await wallet.registerAccountWithPXE(contractSecretKey, partialAddress);
    // deploy contract
    const paymentMethod = await prepareForFeePayment(wallet);
    const contract = await contractDeployment
        .send({
            from: AztecAddress.fromString(activeAccount),
            fee: { paymentMethod }
        })
        .deployed();
    return {
        escrow: contract,
        escrowSecretKey: contractSecretKey
    };
}

export const depositToEscrow = async (
    wallet: Wallet,
    activeAccount: string,
    escrow: string,
    authwit: any,
    nonce: Fr
): Promise<TxReceipt> => {
    const escrowAddress = AztecAddress.fromString(escrow);
    const contract = await OTCEscrowContract.at(escrowAddress, wallet);
    const paymentMethod = await prepareForFeePayment(wallet);
    return await contract
        .withWallet(wallet)
        .methods
        .deposit_tokens(nonce)
        .send({
            from: AztecAddress.fromString(activeAccount),
            authWitnesses: [authwit],
            fee: { paymentMethod }
        })
        .wait();
}