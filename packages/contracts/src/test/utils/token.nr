use token_contract::Token;
use aztec::{
    protocol_types::address::AztecAddress,
    test::helpers::{
        test_environment::TestEnvironment,
        authwit::add_private_authwit_from_call_interface
    }
};

pub unconstrained fn mint_to_private(
    env: &mut TestEnvironment,
    token_address: AztecAddress,
    minter: AztecAddress,
    recipient: AztecAddress,
    amount: u128
) {
    env.call_private(
        minter,
        Token::at(token_address).mint_to_private(recipient, amount)
    );
}


pub unconstrained fn expect_private_balance(
    env: &mut TestEnvironment,
    token_address: AztecAddress,
    account_address: AztecAddress,
    expected_balance: u128
) {
    assert_eq(
        env.simulate_utility(Token::at(token_address).balance_of_private(account_address)),
        expected_balance,
    );
}

/**
 * Adds a private authwit for a private token transfer
 *
 * @param token_address - the address of the token contract being called
 * @param caller - the address of the contract consuming the authwit/ recipient
 *                 you may need an additional recipient param for other usecases
 * @param from - the address holding tokens to transfer
 * @param amount - the amount of tokens to transfer
 * @param nonce - the authwit nonce
 */
pub unconstrained fn private_transfer_authwit(
    token_address: AztecAddress,
    caller: AztecAddress,
    from: AztecAddress,
    amount: u128,
    nonce: Field
) {
    let call_interface = Token::at(token_address)
        .transfer_in_private(from, caller, amount, nonce);
    add_private_authwit_from_call_interface(
        from,
        caller,
        call_interface
    );
}

