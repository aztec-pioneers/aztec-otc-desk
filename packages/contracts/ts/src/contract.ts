import {
    Contract,
    AztecAddress,
    Fr,
    deriveKeys,
    PXE,
    DeployOptions,
    TxHash,
    type Wallet,
    createAztecNodeClient,
    SendMethodOptions,
    WaitOpts,
    CallIntent,
    AuthWitness,
    SimulateMethodOptions,
} from "@aztec/aztec.js";
import { computePartialAddress, ContractInstanceWithAddress } from "@aztec/stdlib/contract";
import {
    OTCEscrowContract,
    OTCEscrowContractArtifact,
    TokenContract,
    TokenContractArtifact
} from "./artifacts";

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
    pxe: PXE,
    deployer: Wallet,
    sellTokenAddress: AztecAddress,
    sellTokenAmount: bigint,
    buyTokenAddress: AztecAddress,
    buyTokenAmount: bigint,
    opts: { deploy: DeployOptions, wait?: WaitOpts } = { deploy: { from: AztecAddress.ZERO} }
): Promise<{ contract: OTCEscrowContract, secretKey: Fr }> {
    // get keys for contract
    const contractSecretKey = Fr.random();
    const contractPublicKeys = (await deriveKeys(contractSecretKey)).publicKeys;

    // set up contract deployment tx
    const contractDeployment = await OTCEscrowContract.deployWithPublicKeys(
        contractPublicKeys,
        deployer,
        sellTokenAddress,
        sellTokenAmount,
        buyTokenAddress,
        buyTokenAmount
    );

    // add contract decryption keys to PXE
    const partialAddress = await computePartialAddress(
        await contractDeployment.getInstance(),
    );
    await pxe.registerAccount(contractSecretKey, partialAddress);
    // deploy contract
    opts.deploy = {
        ...opts.deploy,
        from: await deployer.getAccounts().then(accounts => accounts[0].item),
    };
    const contract = await contractDeployment
        .send(opts.deploy)
        .deployed(opts.wait);
    return { contract, secretKey: contractSecretKey };
}

/**
 * Deploys a new instance of Defi-Wonderland's Fungible Token Contract
 * @param tokenMetadata - the name, symbol, and decimals of the token
 * @param deployer - the account deploying the token contract (gets minter rights)
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the deployed Token Contract
 */
export async function deployTokenContract(
    tokenMetadata: { name: string; symbol: string; decimals: number },
    deployer: Wallet,
    opts: { deploy: DeployOptions, wait?: WaitOpts } = { deploy: { from: AztecAddress.ZERO} }
): Promise<TokenContract> {
    const deployerAddress = await deployer.getAccounts().then(accounts => accounts[0].item);
    opts.deploy = {
        ...opts.deploy,
        from: deployerAddress,
    }
    const contract = await TokenContract.deploy(
        deployer,
        deployerAddress,
        tokenMetadata.name,
        tokenMetadata.symbol,
        tokenMetadata.decimals,
    )
        .send(opts.deploy)
        .deployed(opts.wait);
    return contract;
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
 * @param opts - Aztec function send and wait options (optional)
 * @returns - the transaction hash of the deposit transaction
 */
export async function depositToEscrow(
    escrow: OTCEscrowContract,
    caller: Wallet,
    token: TokenContract,
    amount: bigint,
    opts: { send: SendMethodOptions, wait?: WaitOpts } = { send: { from: AztecAddress.ZERO } }
): Promise<TxHash> {
    escrow = escrow.withWallet(caller);
    // create authwit
    const { authwit, nonce } = await getPrivateTransferAuthwit(
        token,
        caller,
        escrow.address,
        escrow.address,
        amount,
    );

    // send transfer_in with authwit
    opts.send = {
        ...opts.send,
        from: await caller.getAccounts().then(accounts => accounts[0].item),
    };
    const receipt = await escrow
        .methods
        .deposit_tokens(nonce)
        .with({ authWitnesses: [authwit], })
        .send(opts.send)
        .wait(opts.wait);
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
    escrow: OTCEscrowContract,
    caller: Wallet,
    token: TokenContract,
    amount: bigint,
    opts: { send: SendMethodOptions, wait?: WaitOpts } = { send: { from: AztecAddress.ZERO } }
): Promise<TxHash> {
    escrow = escrow.withWallet(caller);

    // create authwit
    const { authwit, nonce } = await getPrivateTransferAuthwit(
        token,
        caller,
        escrow.address,
        escrow.address,
        amount,
    );

    // send transfer_in with authwit
    opts.send = {
        ...opts.send,
        from: await caller.getAccounts().then(accounts => accounts[0].item),
    };
    const receipt = await escrow
        .methods
        .fill_order(nonce)
        .with({ authWitnesses: [authwit] })
        .send(opts.send)
        .wait(opts.wait);
    return receipt.txHash;
}

/**
 * Create authwit for a private token transfer
 * @param token - the token contract instance
 * @param caller - address that will call transfer_in_private
 * @param from - wallet authorizing the transfer
 * @param to - address receiving the tokens
 * @param amount - amount of tokens to transfer
 */
export async function getPrivateTransferAuthwit(
    token: TokenContract,
    from: Wallet,
    caller: AztecAddress,
    to: AztecAddress,
    amount: bigint,
): Promise<{ authwit: AuthWitness, nonce: Fr }> {
    const nonce = Fr.random();
    const fromAddress = await from.getAccounts().then(accounts => accounts[0].item);
    const call = await token.withWallet(from).methods.transfer_in_private(
        fromAddress,
        to,
        amount,
        nonce,
    ).getFunctionCall();
    const authwit = await from.createAuthWit(fromAddress, { caller, call });
    return { authwit, nonce }
}

/**
 * Checks that a private balance of a token for a specific address matches expectations
 * @param token - the token balance to query
 * @param owner - the address of the token holder
 * @param expectedBalance - the balance expected to be returned
 * @returns - true if balance matches expectations, and false otherwise
 */
export async function expectBalancePrivate(
    token: TokenContract,
    wallet: Wallet,
    owner: AztecAddress,
    expectedBalance: bigint,
    opts: SimulateMethodOptions = { from: AztecAddress.ZERO }
): Promise<boolean> {
    const walletAddress = await wallet.getAccounts().then(accounts => accounts[0].item);
    opts = { ...opts, from: walletAddress };
    const empiricalBalance = await token
        .withWallet(wallet)
        .methods
        .balance_of_private(owner)
        .simulate(opts);
    return empiricalBalance === expectedBalance;
}


export const getTokenContract = async (
    pxe: PXE,
    caller: Wallet,
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
    await token.methods.sync_private_state().simulate({
        from: await caller.getAccounts().then(accounts => accounts[0].item),
    });
    return token;
};

export const getEscrowContract = async (
    pxe: PXE,
    caller: Wallet,
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
    await escrow.methods.sync_private_state().simulate({
        from: await caller.getAccounts().then(accounts => accounts[0].item),
    });
    return escrow;
};