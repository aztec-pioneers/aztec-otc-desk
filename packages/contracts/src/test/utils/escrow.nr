use aztec::{
    oracle::random::random,
    protocol_types::address::AztecAddress,
    test::helpers::test_environment::TestEnvironment,
};
use crate::{
    OTCEscrow,
    types::config_note::ConfigNote,
    test::utils::token::{private_transfer_authwit}
};

pub unconstrained fn get_escrow_config(
    env: &mut TestEnvironment,
    escrow_address: AztecAddress
) -> ConfigNote {
    env.simulate_utility(
        OTCEscrow::at(escrow_address)
            .get_config()
    )
}

pub unconstrained fn deposit_to_escrow(
    env: &mut TestEnvironment,
    seller_address: AztecAddress,
    escrow_address: AztecAddress,
    sell_token_address: AztecAddress,
    sell_token_amount: u128,
    malicious_authwit: bool
) {
    // add transfer authwit
    let mut nonce = unsafe { random() };
    private_transfer_authwit(
        *env,
        sell_token_address,
        escrow_address,
        seller_address,
        sell_token_amount,
        nonce
    );
    
    // increment nonce to make authwit invalid
    nonce += malicious_authwit as Field;

    // call deposit
    env.call_private(
        seller_address,
        OTCEscrow::at(escrow_address)
            .deposit_tokens(nonce)
    )
}

pub unconstrained fn fill_otc_order(
    env: &mut TestEnvironment,
    buyer_address: AztecAddress,
    escrow_address: AztecAddress,
    buy_token_address: AztecAddress,
    buy_token_amount: u128,
    malicious_authwit: bool
) {
    // add transfer authwit
    let mut nonce = unsafe { random() };
    private_transfer_authwit(
        *env,
        buy_token_address,
        escrow_address,
        buyer_address,
        buy_token_amount,
        nonce
    );

    // increment nonce to make authwit invalid
    nonce += malicious_authwit as Field;

    // call fulfill
    env.call_private(
        buyer_address,
        OTCEscrow::at(escrow_address)
            .fill_order(nonce)
    )
}
