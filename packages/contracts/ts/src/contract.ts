import {
    Contract,
    AztecAddress,
    Fr,
    deriveKeys,
    PXE,
    DeployOptions,
    TxHash,
    AccountWallet,
    createAztecNodeClient,
    SponsoredFeePaymentMethod,
    SendMethodOptions,
} from "@aztec/aztec.js";
import { computePartialAddress, ContractInstanceWithAddress } from "@aztec/stdlib/contract";
import {
    OTCEscrowContract,
    OTCEscrowContractArtifact,
    TokenContract,
    TokenContractArtifact
} from "./artifacts";
import { GasSettings } from "@aztec/stdlib/gas";
import { getSponsoredFPCAddress, getSponsoredFPCInstance } from "./fees";
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC";

/**
 * Deploys a new instance of the OTC Escrow Contract
 * @dev ensures contract is built with known encryption keys and adds to deployer PXE
 * 
 * @param pxe - the PXE of the deploying account
 * @param deployer - the account deploying the OTC Escrow Contract (the maker)
 * @param sellTokenAddress - the address of the token being selled / sold by the maker
 * @param sellTokenAmount - quantity of sellToken the maker wants to sell
 * @param buyTokenAddress - the address of the token being buyed for/ bought by the maker
 * @param buyTokenAmount - quantity of buyToken the maker wants to buy
 * @param deployOptions - Aztec contract deployment options (optional)
 * @returns
 *          contract - the deployed OTC Escrow Contract
 *          secretKey - the master key for the contract
 */
export async function deployEscrowContract(
    pxe: PXE,
    deployer: AccountWallet,
    sellTokenAddress: AztecAddress,
    sellTokenAmount: bigint,
    buyTokenAddress: AztecAddress,
    buyTokenAmount: bigint,
    deployOptions?: DeployOptions,
): Promise<{ contract: OTCEscrowContract, secretKey: Fr }> {
    // get keys for contract
    const contractSecretKey = Fr.random();
    const contractPublicKeys = (await deriveKeys(contractSecretKey)).publicKeys;

    // set up contract deployment tx
    const contractDeployment = await Contract.deployWithPublicKeys(
        contractPublicKeys,
        deployer,
        OTCEscrowContractArtifact,
        [sellTokenAddress, sellTokenAmount, buyTokenAddress, buyTokenAmount],
    );

    // add contract decryption keys to PXE
    const partialAddress = await computePartialAddress(
        await contractDeployment.getInstance(),
    );
    await pxe.registerAccount(contractSecretKey, partialAddress);
    // deploy contract
    const contract = await contractDeployment
        .send(deployOptions)
        .deployed({ timeout: 3600 });
    return {
        contract: contract as OTCEscrowContract,
        secretKey: contractSecretKey,
    };
}

/**
 * Deploys a new instance of Defi-Wonderland's Fungible Token Contract
 * @param tokenMetadata - the name, symbol, and decimals of the token
 * @param deployer - the account deploying the token contract (gets minter rights)
 * @param deployOptions - Aztec contract deployment options (optional)
 * @returns - the deployed Token Contract
 */
export async function deployTokenContractWithMinter(
    tokenMetadata: { name: string; symbol: string; decimals: number },
    deployer: AccountWallet,
    deployOptions?: DeployOptions,
): Promise<TokenContract> {
    const contract = await Contract.deploy(
        deployer,
        TokenContractArtifact,
        [
            tokenMetadata.name,
            tokenMetadata.symbol,
            tokenMetadata.decimals,
            deployer.getAddress(),
            AztecAddress.ZERO,
        ],
        "constructor_with_minter",
    )
        .send(deployOptions)
        .deployed({ timeout: 3600 });
    return contract as TokenContract;
}

/**
 * Deposit tokens into the escrow contract so that the taker can fill the order
 * @param PXE - pxe to use to fetch events from
 * @param escrow - the escrow contract to deposit into
 * @param caller - the maker who is selling tokens
 * @param token - the contract instance of the token being sold by the maker
 * @param amount - the amount of tokens to transfer in
 * @param makerSecret - the secret used to privately authorize maker actions
 *                      if not supplied, will retrieve from storage
 */
export async function depositToEscrow(
    escrow: OTCEscrowContract,
    caller: AccountWallet,
    sellToken: TokenContract,
    sellTokenAmount: bigint,
    sendOptions?: SendMethodOptions
): Promise<TxHash> {
    escrow = escrow.withWallet(caller);
    // create authwit
    const nonce = Fr.random();
    const authwit = await caller.createAuthWit({
        caller: escrow.address,
        action: sellToken.methods.transfer_private_to_private(
            caller.getAddress(),
            escrow.address,
            sellTokenAmount,
            nonce,
        ),
    });

    // send transfer_in with authwit
    const receipt = await escrow
        .methods
        .deposit_tokens(nonce)
        .with({ authWitnesses: [authwit], })
        .send(sendOptions)
        .wait({ timeout: 3600 });
    return receipt.txHash;
}

/**
 * Deposit tokens into the escrow contract so that the taker can fill the order
 * @param escrow - the escrow contract to deposit into
 * @param caller - the taker who is buying tokens / filling the order
 * @param token - the contract instance of the token being bought by the maker (sold by the taker)
 * @param amount - the amount of tokens to transfer in
 */
export async function fillOTCOrder(
    escrow: OTCEscrowContract,
    caller: AccountWallet,
    token: TokenContract,
    amount: bigint,
    sendOptions?: SendMethodOptions
): Promise<TxHash> {
    escrow = escrow.withWallet(caller);

    // create authwit
    const nonce = Fr.random();
    const authwit = await caller.createAuthWit({
        caller: escrow.address,
        action: token.withWallet(caller).methods.transfer_private_to_private(
            caller.getAddress(),
            escrow.address,
            amount,
            nonce,
        ),
    });

    // send transfer_in with authwit
    const receipt = await escrow
        .methods
        .fill_order(nonce)
        .with({ authWitnesses: [authwit] })
        .send(sendOptions)
        .wait({ timeout: 3600 });
    return receipt.txHash;
}

/**
 * Checks that a private balance of a token for a specific address matches expectations
 * @param token - the token balance to query
 * @param address - the address of the token holder
 * @param expectedBalance - the balance expected to be returned
 * @returns - true if balance matches expectations, and false otherwise
 */
export async function expectBalancePrivate(
    token: TokenContract,
    address: AztecAddress,
    expectedBalance: bigint
): Promise<boolean> {
    const empiricalBalance = await token
        .methods
        .balance_of_private(address)
        .simulate();
    return empiricalBalance === expectedBalance;
}


export const getTokenContract = async (
    pxe: PXE,
    caller: AccountWallet,
    tokenAddress: AztecAddress,
    aztecRpcUrl: string = "http://localhost:8080"
): Promise<TokenContract> => {
    const node = createAztecNodeClient(aztecRpcUrl);
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
    caller: AccountWallet,
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
    await pxe.registerSender(escrowAddress);
    const escrow = await OTCEscrowContract.at(escrowAddress, caller);
    await escrow.methods.sync_private_state().simulate();
    return escrow;
};