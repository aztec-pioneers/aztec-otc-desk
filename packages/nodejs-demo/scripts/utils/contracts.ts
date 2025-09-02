import { AccountWalletWithSecretKey, AztecAddress, createAztecNodeClient, Fr, type ContractInstanceWithAddress, type PXE } from "@aztec/aztec.js";
import { TokenContractArtifact, TokenContract } from "../../../contracts/artifacts/Token";
import {
    OTCEscrowContractContract as OTCEscrowContract,
    OTCEscrowContractContractArtifact as OTCEscrowContractArtifact
} from "../../../contracts/artifacts/OTCEscrowContract";

const { L1_RPC_URL } = process.env;

if (!L1_RPC_URL) {
    throw new Error("L1_RPC_URL is not defined");
}

export const getTokenContract = async (
    pxe: PXE,
    caller: AccountWalletWithSecretKey,
    tokenAddress: AztecAddress
): Promise<TokenContract> => {
    const node = createAztecNodeClient(L1_RPC_URL);
    const contractInstance = await node.getContract(tokenAddress);
    if (!contractInstance) {
        throw new Error(`No instance for token contract at ${tokenAddress.toString()} found!`);
    }
    await pxe.registerContract({
        instance: contractInstance,
        artifact: TokenContractArtifact
    });
    const token = await TokenContract.at(tokenAddress, caller);
    await token.methods.sync_private_state().simulate();
    return token;
};

export const getEscrowContract = async (
    pxe: PXE,
    caller: AccountWalletWithSecretKey,
    escrowAddress: AztecAddress,
    contractInstance: ContractInstanceWithAddress,
    escrowSecretKey: Fr,
    escrowPartialAddress: Fr
): Promise<OTCEscrowContract> => {
    // register contract & contract account
    await pxe.registerContract({
        instance: contractInstance,
        artifact: OTCEscrowContractArtifact
    });
    await pxe.registerAccount(escrowSecretKey, escrowPartialAddress);
    const escrow = await OTCEscrowContract.at(escrowAddress, caller);
    await escrow.methods.sync_private_state().simulate();
    return escrow;
};
