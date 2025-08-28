use crate::test::utils::{
    setup::{setup, USDC_ESCROW_AMOUNT, WETH_ESCROW_AMOUNT},
    escrow::get_escrow_definition,
};
use aztec::{
    oracle::debug_log::{debug_log, debug_log_format},
    protocol_types::traits::ToField,
};

// test basic escrow
#[test]
unconstrained fn full_escrow_success() {
    // get test environment
    debug_log("Setting up accounts");
    let (env, accounts, contracts) = setup(true);
    
    // check the definition
    debug_log("Getting escrow definition");
    let definition = get_escrow_definition(contracts.escrow);
    debug_log_format("Got escrow definition:\nowner: {1}", [definition.owner.to_field()]);
    assert_eq(definition.owner, contracts.escrow, "Definition owner mismatch!");
    assert_eq(definition.sell_token_address, contracts.usdc, "Definition sell token address mismatch!");
    assert_eq(definition.sell_token_amount, USDC_ESCROW_AMOUNT, "Definition sell token amount mismatch!");
    assert_eq(definition.buy_token_address, contracts.weth, "Definition buy token address mismatch!");
    assert_eq(definition.buy_token_amount, WETH_ESCROW_AMOUNT, "Definition buy token amount mismatch!");
    assert(definition.partial_note != 0, "Definition partial note is zero!");
    // assert(1 == 1);
    // deposit to escrow
}

// test try deposit not enough money
// test multiple deposit?
// test with wrong authwit?
// test try withdraw not enough money
// test try withdraw twice (should fail on transfer commitment)
// test can't fill before deposit (shouldn't have tokens in)
// test can fill own order