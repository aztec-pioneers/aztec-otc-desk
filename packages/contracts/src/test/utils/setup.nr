
use aztec::{
    oracle::random::random,
    protocol_types::address::AztecAddress,
    test::helpers::{test_environment::TestEnvironment, txe_oracles}
};
use token_contract::Token;
use crate::OTCEscrow;

// Token metadata
pub global USDC_NAME: str<31> = "USD Coin\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
pub global USDC_SYMBOL: str<31> = "USDC\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
pub global USDC_DECIMALS: u8 = 6;

pub global ETH_NAME: str<31> = "Ether\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
pub global ETH_SYMBOL: str<31> = "ETH\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n";
pub global ETH_DECIMALS: u8 = 18;

pub global USDC_ESCROW_AMOUNT: u128 = (1000 * 10.pow_32(6)) as u128;
pub global ETH_ESCROW_AMOUNT: u128 = (1 * 10.pow_32(18)) as u128;

// pub global USDC_ESCROW_AMOUNT: u128 = 1;
// pub global ETH_ESCROW_AMOUNT: u128 = 1;

// Named structs for easy readability
pub struct TestAccounts {
    pub minter: AztecAddress,
    pub seller: AztecAddress,
    pub buyer: AztecAddress,
    pub external: AztecAddress,
    pub escrow_secret: Field
}

pub struct TestContracts {
    pub usdc: AztecAddress,
    pub eth: AztecAddress,
    pub escrow: AztecAddress,
}

/**
 * Setup hook for test environment
 *
 * @param mint - if true, mint USDC to seller and ETH to buyer
 * @return
 *          - the TXE test environment context
 *          - named accounts deployed for the test
 *          - named contracts deployed for the test
 */
pub unconstrained fn setup(mint: bool) -> (
    &mut TestEnvironment,
    TestAccounts,
    TestContracts,
) {
    // setup accounts
    let mut env = TestEnvironment::new();
    let accounts = setup_accounts::<4>(&mut env);
    let mut test_accounts = TestAccounts {
        minter: accounts[0],
        seller: accounts[1],
        buyer: accounts[2],
        external: accounts[3],
        escrow_secret: 0
    };

    // deploy contracts
    let usdc = deploy_token_contract(
        &mut env,
        test_accounts.minter,
        USDC_NAME,
        USDC_SYMBOL,
        USDC_DECIMALS
    );
    let eth = deploy_token_contract(
        &mut env,
        test_accounts.minter,
        ETH_NAME,
        ETH_SYMBOL,
        ETH_DECIMALS
    );
    let (escrow, escrow_secret) = deploy_escrow_contract(
        &mut env,
        test_accounts.seller,
        usdc,
        USDC_ESCROW_AMOUNT,
        eth,
        ETH_ESCROW_AMOUNT
    );
    // mint to accounts
    if (mint) {
        env.call_private(
            test_accounts.minter,
            Token::at(usdc).mint_to_private(
                test_accounts.seller,
                USDC_ESCROW_AMOUNT
            )
        );
        
        env.call_private(
            test_accounts.minter,
            Token::at(eth).mint_to_private(
                test_accounts.buyer,
                ETH_ESCROW_AMOUNT
            )
        );
    }
    // named contract struct 
    let test_contracts = TestContracts { usdc, eth, escrow };
    test_accounts.escrow_secret = escrow_secret;

    (&mut env, test_accounts, test_contracts)
}

pub unconstrained fn setup_accounts<let NUM_ACCOUNTS: u32>(
    env: &mut TestEnvironment
) -> [AztecAddress; NUM_ACCOUNTS] {
    // Setup env, generate keys
    let mut accounts = [AztecAddress::zero(); NUM_ACCOUNTS];
    for i in 0..NUM_ACCOUNTS {        
        accounts[i] = env.create_contract_account();
    }
    accounts
}

pub unconstrained fn deploy_token_contract(
    env: &mut TestEnvironment,
    owner: AztecAddress,
    name: str<31>,
    symbol: str<31>,
    decimals: u8
) -> AztecAddress {
    let initializer_call_interface = Token::interface()
        .constructor_with_minter(
            name,
            symbol,
            decimals,
            owner,
            AztecAddress::zero()
        );
    env.deploy("Token")
        .with_public_initializer(owner, initializer_call_interface)
}

pub unconstrained fn deploy_escrow_contract(
    env: &mut TestEnvironment,
    owner: AztecAddress,
    sell_token_address: AztecAddress,
    sell_token_amount: u128,
    buy_token_address: AztecAddress,
    buy_token_amount: u128
) -> (AztecAddress, Field) {
    // setup keys for escrow account
    let escrow_secret = unsafe { random() };
    let _ = txe_oracles::add_account(escrow_secret);

    // deploy escrow contract
    let initializer_call_interface = OTCEscrow::interface()
        .constructor(
            sell_token_address,
            sell_token_amount,
            buy_token_address,
            buy_token_amount
        );
     // deploy escrow contract
    let initializer_call_interface = OTCEscrow::interface()
        .constructor(
            sell_token_address,
            sell_token_amount,
            buy_token_address,
            buy_token_amount
        );
    let mut contract_instance = env.deploy("OTCEscrow");

    contract_instance.secret = escrow_secret;
        
    let contract_address = contract_instance.with_private_initializer(owner, initializer_call_interface);

    (contract_address, escrow_secret)
}