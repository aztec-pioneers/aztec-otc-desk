use crate::test::utils::{
    setup::{setup, USDC_ESCROW_AMOUNT, WETH_ESCROW_AMOUNT},
    escrow::{
        deposit_to_escrow,
        get_escrow_definition
    },
    token::expect_private_balance
};
use aztec::{
    oracle::{
        random::random,
        debug_log::{debug_log, debug_log_format},
    },
    protocol_types::traits::ToField,
};

// test basic escrow
#[test]
unconstrained fn full_escrow_success() {
    // get test environment
    debug_log("Setting up accounts");
    let (env, accounts, contracts) = setup(true);
    
    // check the definition
    let definition = get_escrow_definition(contracts.escrow);
    assert_eq(definition.owner, contracts.escrow, "Definition owner mismatch!");
    assert_eq(definition.sell_token_address, contracts.usdc, "Definition sell token address mismatch!");
    assert_eq(definition.sell_token_amount, USDC_ESCROW_AMOUNT, "Definition sell token amount mismatch!");
    assert_eq(definition.buy_token_address, contracts.weth, "Definition buy token address mismatch!");
    assert_eq(definition.buy_token_amount, WETH_ESCROW_AMOUNT, "Definition buy token amount mismatch!");
    assert(definition.partial_note != 0, "Definition partial note is zero!");

    // check usdc balance of seller and contract before deposit
    expect_private_balance(contracts.usdc, accounts.seller, USDC_ESCROW_AMOUNT);
    expect_private_balance(contracts.usdc, contracts.escrow, 0);

    // deposit to escrow
    deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT
    );

    // check usdc balance of seller and contract after deposit
    expect_private_balance(contracts.usdc, accounts.seller, 0);
    expect_private_balance(contracts.usdc, contracts.escrow, USDC_ESCROW_AMOUNT);
}

// test try deposit not enough money
// test multiple deposit?
// test with wrong authwit?
// test try withdraw not enough money
// test try withdraw twice (should fail on transfer commitment)
// test can't fill before deposit (shouldn't have tokens in)
// test can fill own order