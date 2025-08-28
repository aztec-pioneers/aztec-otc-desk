use crate::test::utils::{
    setup::{setup, USDC_ESCROW_AMOUNT, WETH_ESCROW_AMOUNT},
    escrow::{
        deposit_to_escrow,
        fill_otc_order,
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
use uint_note::uint_note::PartialUintNote;

// Basic e2e escrow test
#[test]
unconstrained fn full_otc_order_success() {
    // get test environment
    let (env, accounts, contracts) = setup(true);
    
    // check the definition
    let definition = get_escrow_definition(contracts.escrow);
    assert_eq(definition.owner, contracts.escrow, "Definition owner mismatch!");
    assert_eq(definition.sell_token_address, contracts.usdc, "Definition sell token address mismatch!");
    assert_eq(definition.sell_token_amount, USDC_ESCROW_AMOUNT, "Definition sell token amount mismatch!");
    assert_eq(definition.buy_token_address, contracts.weth, "Definition buy token address mismatch!");
    assert_eq(definition.buy_token_amount, WETH_ESCROW_AMOUNT, "Definition buy token amount mismatch!");
    debug_log_format("Partial Note commitment: {0}", [definition.partial_note]);

    // check the partial note commitment in the definition is valid
    let validity_commitment = PartialUintNote { 
        commitment: definition.partial_note 
    }.compute_validity_commitment(contracts.escrow);
    assert(
        env.public().nullifier_exists(validity_commitment, contracts.weth),
        "Validity nullifier should exist",
    );


    // check usdc balance of seller and contract before deposit
    expect_private_balance(contracts.usdc, accounts.seller, USDC_ESCROW_AMOUNT);
    expect_private_balance(contracts.usdc, contracts.escrow, 0);

    // // deposit to escrow
    deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT
    );

    // // check usdc balance of seller and contract after deposit
    // expect_private_balance(contracts.usdc, accounts.seller, 0);
    // expect_private_balance(contracts.usdc, contracts.escrow, USDC_ESCROW_AMOUNT);

    // // fill the otc order
    fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.weth,
        WETH_ESCROW_AMOUNT
    );

    // // check balances after otc order is complete
    // expect_private_balance(contracts.usdc, accounts.buyer, USDC_ESCROW_AMOUNT);
    // expect_private_balance(contracts.usdc, contracts.escrow, 0);
    // expect_private_balance(contracts.weth, accounts.seller, WETH_ESCROW_AMOUNT);
}

// test try deposit not enough money
unconstrained fn otc_deposit_insufficient_balance_fail() {
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
        accounts.buyer,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT
    );

    // check usdc balance of seller and contract after deposit
    expect_private_balance(contracts.usdc, accounts.seller, 0);
    expect_private_balance(contracts.usdc, contracts.escrow, USDC_ESCROW_AMOUNT);

    // fill the otc order
    fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.weth,
        WETH_ESCROW_AMOUNT
    );

    // check balances after otc order is complete
    expect_private_balance(contracts.usdc, accounts.buyer, USDC_ESCROW_AMOUNT);
    expect_private_balance(contracts.usdc, contracts.escrow, 0);
    expect_private_balance(contracts.weth, accounts.seller, WETH_ESCROW_AMOUNT);
}

// test multiple deposit?
// test with wrong authwit?
// test try withdraw not enough money
// test try withdraw twice (should fail on transfer commitment)
// test can't fill before deposit (shouldn't have tokens in)
// test can fill own order