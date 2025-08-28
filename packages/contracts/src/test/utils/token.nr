use token_contract::Token;
use aztec::{
    prelude::AztecAddress,
    oracle::execution::get_contract_address,
    test::helpers::{
        test_environment::TestEnvironment,
        cheatcodes
    }
};

pub unconstrained fn mint_to_private(
    env: &mut TestEnvironment,
    token_address: AztecAddress,
    minter: AztecAddress,
    recipient: AztecAddress,
    amount: u128
) {
    env.impersonate(minter);
    Token::at(token_address)
        .mint_to_private(minter, recipient, amount)
        .call(&mut env.private()
    );
    env.advance_block_by(1);
}

pub unconstrained fn get_balance_private(
    token_address: AztecAddress,
    account_address: AztecAddress,
) -> u128 {
    let current_contract_address = get_contract_address();
    cheatcodes::set_contract_address(token_address);
    
    let amount = Token::balance_of_private(account_address);
    cheatcodes::set_contract_address(current_contract_address);
    amount
}

