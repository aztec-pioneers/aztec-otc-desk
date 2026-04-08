use token_contract::Token;
use crate::test::utils::{
    setup::{setup, USDC_ESCROW_AMOUNT, ETH_ESCROW_AMOUNT},
    escrow,
    token
};

#[test]
unconstrained fn test_deploy_and_read_config() {
    let (env, _accounts, contracts) = setup(false);

    let config = escrow::get_escrow_config(env, contracts.escrow);
    assert_eq(config.owner, contracts.escrow);
    assert_eq(config.sell_token_address, contracts.usdc);
    assert_eq(config.sell_token_amount, USDC_ESCROW_AMOUNT);
    assert_eq(config.buy_token_address, contracts.eth);
    assert_eq(config.buy_token_amount, ETH_ESCROW_AMOUNT);
    assert(config.randomness != 0);
}

// TODO: TXE limitation - the TXE scopes notes/keys to [from], so when deposit_tokens or
// fill_order runs with from=seller/buyer, the escrow's config note is not visible.
// This e2e test must be covered by JS e2e tests (packages/tests/).
//
// #[test]
// unconstrained fn full_otc_order_success() {
//     let (env, accounts, contracts) = setup(true);
//     let config = escrow::get_escrow_config(env, contracts.escrow);
//     assert_eq(config.owner, contracts.escrow, "Config owner mismatch!");
//     assert_eq(config.sell_token_address, contracts.usdc, "Config sell token address mismatch!");
//     assert_eq(config.sell_token_amount, USDC_ESCROW_AMOUNT, "Config sell token amount mismatch!");
//     assert_eq(config.buy_token_address, contracts.eth, "Config buy token address mismatch!");
//     assert_eq(config.buy_token_amount, ETH_ESCROW_AMOUNT, "Config buy token amount mismatch!");
//     token::expect_private_balance(env, contracts.usdc, accounts.seller, USDC_ESCROW_AMOUNT);
//     token::expect_private_balance(env, contracts.usdc, contracts.escrow, 0);
//     escrow::deposit_to_escrow(env, accounts.seller, contracts.escrow, contracts.usdc, USDC_ESCROW_AMOUNT, false);
//     token::expect_private_balance(env, contracts.usdc, accounts.seller, 0);
//     token::expect_private_balance(env, contracts.usdc, contracts.escrow, USDC_ESCROW_AMOUNT);
//     escrow::fill_otc_order(env, accounts.buyer, contracts.escrow, contracts.eth, ETH_ESCROW_AMOUNT, false);
//     token::expect_private_balance(env, contracts.usdc, accounts.buyer, USDC_ESCROW_AMOUNT);
//     token::expect_private_balance(env, contracts.usdc, contracts.escrow, 0);
// }

// ensure cannot deposit without sufficient balance
#[test(should_fail)]
unconstrained fn otc_deposit_insufficient_balance_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(false);

    // try to deposit to escrow with insufficient balance
    escrow::deposit_to_escrow(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );
}

// ensure cannot deposit with incorrect authwit
#[test(should_fail)]
unconstrained fn otc_deposit_incorrect_authwit_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);

    // try to deposit to escrow with malicious authwit
    escrow::deposit_to_escrow(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        true // malicious authwit
    );
}

// ensure cannot deposit twice
#[test(should_fail)]
unconstrained fn otc_deposit_twice_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);

    // deposit once successfully
    escrow::deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );

    // mint extra tokens to seller so they have enough to deposit twice
    env.call_private(
        accounts.minter,
        Token::at(contracts.usdc)
            .mint_to_private(accounts.seller, USDC_ESCROW_AMOUNT)
    );

    // try to deposit a second time
    escrow::deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );
}

// ensure cannot fill order without sufficient balance
#[test(should_fail)]
unconstrained fn otc_fill_insufficient_balance_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(false);

    // mint so seller can deposit
    env.call_private(
        accounts.minter,
        Token::at(contracts.usdc)
            .mint_to_private(accounts.seller, USDC_ESCROW_AMOUNT)
    );

    // deposit to escrow
    escrow::deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );

    // try to fill order without tokens
    escrow::fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.eth,
        ETH_ESCROW_AMOUNT,
        false // no malicious authwit
    );
}

// ensure cannot fill order with incorrect authwit
#[test(should_fail)]
unconstrained fn otc_fill_incorrect_authwit_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);

    // deposit to escrow
    escrow::deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );

    // try filling order with malicious authwit
    escrow::fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.eth,
        ETH_ESCROW_AMOUNT,
        true // malicious authwit
    );
}

// ensure cannot fill order before deposit
#[test(should_fail)]
unconstrained fn otc_fill_before_deposit_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);

    // try to fill order before deposit
    escrow::fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.eth,
        ETH_ESCROW_AMOUNT,
        false // no malicious authwit
    );
}

// try to fill order twice
#[test(should_fail)]
unconstrained fn otc_multiple_fill_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);

    // deposit to escrow
    escrow::deposit_to_escrow(
        env,
        accounts.seller,
        contracts.escrow,
        contracts.usdc,
        USDC_ESCROW_AMOUNT,
        false // no malicious authwit
    );

    // first fill (should pass)
    escrow::fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.eth,
        ETH_ESCROW_AMOUNT,
        false // no malicious authwit
    );

    // mint more tokens to buyer to fill order
    env.call_private(
        accounts.minter,
        Token::at(contracts.eth)
            .mint_to_private(accounts.buyer, ETH_ESCROW_AMOUNT)
    );

    // mint more tokens to the escrow so it has some to send back out
    env.call_private(
        accounts.minter,
        Token::at(contracts.usdc)
            .mint_to_private(contracts.escrow, USDC_ESCROW_AMOUNT)
    );

    // second fill (should throw)
    escrow::fill_otc_order(
        env,
        accounts.buyer,
        contracts.escrow,
        contracts.eth,
        ETH_ESCROW_AMOUNT,
        false // no malicious authwit
    );
}
