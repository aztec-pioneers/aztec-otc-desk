import { AztecAddress } from "@aztec/aztec.js/addresses";
import type {
    ContractInstanceWithAddress,
    InteractionWaitOptions,
    SendInteractionOptions,
    SimulateInteractionOptions,
} from "@aztec/aztec.js/contracts";
import { decodeFromAbi } from "@aztec/aztec.js/abi";
import { Fr } from "@aztec/aztec.js/fields";
import type { AztecNode } from "@aztec/aztec.js/node";
import { TxHash } from "@aztec/aztec.js/tx";
import type { Wallet } from "@aztec/aztec.js/wallet";
import { AuthWitness } from "@aztec/stdlib/auth-witness";
import { deriveKeys } from "@aztec/stdlib/keys";
import {
    OTCEscrowContract,
    OTCEscrowContractArtifact,
    TokenContract,
    TokenContractArtifact
} from "./artifacts";
import { type EscrowConfig } from "./constants";

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
 * @param opts - Aztec function send and wait options (optional)
 * @returns
 *          contract - the deployed OTC Escrow Contract
 *          secretKey - the master key for the contract
 */
export async function deployEscrowContract(
    wallet: Wallet,
    from: AztecAddress,
    sellTokenAddress: AztecAddress,
    sellTokenAmount: bigint,
    buyTokenAddress: AztecAddress,
    buyTokenAmount: bigint,
    opts: { send: SendInteractionOptions<InteractionWaitOptions> } = { send: { from } }
): Promise<{ contract: OTCEscrowContract, instance: ContractInstanceWithAddress, secretKey: Fr }> {
    // get keys for contract
    const secretKey = Fr.random();
    const contractPublicKeys = (await deriveKeys(secretKey)).publicKeys;
    // set up contract deployment tx
    const contractDeployment = await OTCEscrowContract.deployWithPublicKeys(
        contractPublicKeys,
        wallet,
        sellTokenAddress,
        sellTokenAmount,
        buyTokenAddress,
        buyTokenAmount
    );
    // add contract decryption keys to PXE
    const instance = await contractDeployment.getInstance();
    await wallet.registerContract(instance, OTCEscrowContractArtifact, secretKey);
    // deploy contract
    opts.send = { additionalScopes: [instance.address], ...opts.send };
    const { contract } = await contractDeployment.send(opts.send);
    return { contract, instance, secretKey };
}

/**
 * Deploys a new instance of Defi-Wonderland's Fungible Token Contract
 * @param tokenMetadata - the name, symbol, and decimals of the token
 * @param deployer - the account deploying the token contract (gets minter rights)
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the deployed Token Contract
 */
export async function deployTokenContract(
    wallet: Wallet,
    from: AztecAddress,
    tokenMetadata: { name: string; symbol: string; decimals: number },
    opts: { send: SendInteractionOptions<InteractionWaitOptions> } = { send: { from } }
): Promise<{ contract: TokenContract, instance: ContractInstanceWithAddress }> {
    // deploy contract
    const contractDeployment = await TokenContract.deployWithOpts(
        { wallet, method: "constructor_with_minter" },
        tokenMetadata.name,
        tokenMetadata.symbol,
        tokenMetadata.decimals,
        from,
    )
    const instance = await contractDeployment.getInstance();
    const { contract } = await contractDeployment.send(opts.send);
    return { contract, instance };
}

/**
 * Deposit tokens into the escrow contract so that the taker can fill the order
 * @param PXE - pxe to use to fetch events from
 * @param escrow - the escrow contract to deposit into
 * @param caller - the maker who is selling tokens
 * @param token - the contract instance of the token being sold by the maker
 * @param amount - the amount of tokens to transfer in
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the transaction hash of the deposit transaction
 */
export async function depositToEscrow(
    wallet: Wallet,
    from: AztecAddress,
    escrow: OTCEscrowContract,
    token: TokenContract,
    amount: bigint,
    opts: { send: SendInteractionOptions<InteractionWaitOptions> } = { send: { from, additionalScopes: [escrow.address] } }
): Promise<TxHash> {
    escrow = escrow.withWallet(wallet);
    // create authwit
    const { nonce, authwit } = await getPrivateTransferAuthwit(
        wallet,
        from,
        token,
        escrow.address,
        escrow.address,
        amount,
    );
    // send transfer_in with authwit
    const { receipt } = await escrow
        .methods
        .deposit_tokens(nonce)
        .with({ authWitnesses: [authwit], })
        .send(opts.send);
    return receipt.txHash;
}

/**
 * Deposit tokens into the escrow contract so that the taker can fill the order
 * @param escrow - the escrow contract to deposit into
 * @param caller - the taker who is buying tokens / filling the order
 * @param token - the contract instance of the token being bought by the maker (sold by the taker)
 * @param amount - the amount of tokens to transfer in
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the transaction hash of the order fill transaction
 */
export async function fillOTCOrder(
    wallet: Wallet,
    from: AztecAddress,
    escrow: OTCEscrowContract,
    token: TokenContract,
    amount: bigint,
    opts: { send: SendInteractionOptions<InteractionWaitOptions> } = { send: { from, additionalScopes: [escrow.address] } }
): Promise<TxHash> {
    escrow = escrow.withWallet(wallet);
    // create authwit
    const { nonce, authwit } = await getPrivateTransferAuthwit(
        wallet,
        from,
        token,
        escrow.address,
        escrow.address,
        amount,
    );
    // send transfer_in with authwit
    const { receipt } = await escrow
        .methods
        .fill_order(nonce)
        .with({ authWitnesses: [authwit] })
        .send(opts.send);
    return receipt.txHash;
}

export async function getPrivateTransferAuthwit(
    wallet: Wallet,
    from: AztecAddress,
    token: TokenContract,
    caller: AztecAddress,
    to: AztecAddress,
    amount: bigint,
): Promise<{ authwit: AuthWitness, nonce: Fr }> {
    // construct call data
    const nonce = Fr.random();
    const call = await token.withWallet(wallet).methods.transfer_private_to_private(
        from,
        to,
        amount,
        nonce,
    ).getFunctionCall();
    // construct private authwit
    const authwit = await wallet.createAuthWit(from, { caller, call });
    return { authwit, nonce }
}

export async function getEscrowConfig(
    wallet: Wallet,
    escrow: OTCEscrowContract,
): Promise<EscrowConfig> {
    const { result } = await escrow
        .withWallet(wallet)
        .methods
        .get_config()
        .simulate({ from: escrow.address });
    return result;
}

/**
 * Checks that a private balance of a token for a specific address matches expectations
 * @param token - the token balance to query
 * @param address - the address of the token holder
 * @param expectedBalance - the balance expected to be returned
 * @returns - true if balance matches expectations, and false otherwise
 */
export async function expectBalancePrivate(
    wallet: Wallet,
    from: AztecAddress,
    token: TokenContract,
    expectedBalance: bigint,
    opts: SimulateInteractionOptions = { from }
): Promise<boolean> {
    const { result: empiricalBalance } = await token
        .withWallet(wallet)
        .methods
        .balance_of_private(from)
        .simulate(opts);
    return empiricalBalance === expectedBalance;
}


export const getTokenContract = async (
    wallet: Wallet,
    from: AztecAddress,
    node: AztecNode,
    tokenAddress: AztecAddress,
): Promise<TokenContract> => {
    // get public contract instance
    const contractInstance = await node.getContract(tokenAddress);
    if (!contractInstance)
        throw new Error(`No instance for token contract at ${tokenAddress.toString()} found!`);

    // register contract in each included wallet
    await wallet.registerContract(contractInstance, TokenContractArtifact);
    // return synced token contract
    return await TokenContract.at(tokenAddress, wallet);
};

export const getEscrowContract = async (
    wallet: Wallet,
    from: AztecAddress,
    escrowAddress: AztecAddress,
    contractInstance: ContractInstanceWithAddress,
    escrowSecretKey: Fr,
): Promise<OTCEscrowContract> => {
    // register contract with secret key
    await wallet.registerContract(
        contractInstance,
        OTCEscrowContractArtifact,
        escrowSecretKey
    );
    await wallet.registerSender(escrowAddress);

    // return synced escrow contract
    return await OTCEscrowContract.at(escrowAddress, wallet);
};