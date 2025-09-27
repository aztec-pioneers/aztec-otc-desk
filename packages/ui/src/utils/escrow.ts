import { AuthWitness, AztecAddress, deriveKeys, Fr, TxReceipt, type Wallet } from "@aztec/aztec.js";
import { OTCEscrowContract, OTCEscrowContractArtifact } from "@aztec-otc-desk/contracts";
import { computePartialAddress, ContractInstanceWithAddressSchema } from "@aztec/stdlib/contract";
import type { EmbeddedWallet } from "../wallet/embeddedWallet";
import { prepareForFeePayment } from "./sponsoredFPC";
import type { Order } from "./api";

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

export const fillOTCOrder = async(
    wallet: Wallet,
    activeAccount: string,
    order: Order,
    authwit: AuthWitness,
    nonce: Fr
): Promise<TxReceipt> => {
    const escrow = await escrowInstanceFromOrder(wallet as EmbeddedWallet, activeAccount, order);
    const paymentMethod = await prepareForFeePayment(wallet);
    return await escrow
        .withWallet(wallet)
        .methods
        .fill_order(nonce)
        .send({
            from: AztecAddress.fromString(activeAccount),
            fee: { paymentMethod },
            authWitnesses: [authwit],
        })
        .wait();
}

const escrowInstanceFromOrder = async (
    wallet: EmbeddedWallet,
    activeAccount: string,
    order: Order,
): Promise<OTCEscrowContract> => {
    // parse order data
    const escrowContractInstance = ContractInstanceWithAddressSchema.parse(
        JSON.parse(order.contractInstance)
    );
    const escrowSecretKey = Fr.fromString(order.secretKey);
    const escrowPartialAddress = Fr.fromString(order.partialAddress);
    const escrowAddress = AztecAddress.fromString(order.escrowAddress);
    // register contract & contract account
    await wallet.registerContract({
        instance: escrowContractInstance,
        artifact: OTCEscrowContractArtifact
    });
    // register escrow secret key
    await wallet.registerAccountWithPXE(escrowSecretKey, escrowPartialAddress);
    await wallet.registerSender(escrowAddress, `Escrow:${order.orderId}`);
    // instantiate contract & sync
    const escrow = await OTCEscrowContract.at(escrowAddress, wallet);
    await escrow.methods.sync_private_state().simulate({
        from: AztecAddress.fromString(activeAccount),
    });
    return escrow;
}