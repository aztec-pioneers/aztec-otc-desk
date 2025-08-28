use aztec::{
    oracle::execution::get_contract_address,
    prelude::AztecAddress,
    protocol_types::contract_instance::ContractInstance,
    test::helpers::{
        test_environment::TestEnvironment,
        cheatcodes
    }
};
use crate::{
    OTCEscrowContract,
    types::definition_note::DefinitionNote
};

pub unconstrained fn get_escrow_definition(
    escrow_address: AztecAddress
) -> DefinitionNote {
    // set cheatcode address to escrow
    let current_contract_address = get_contract_address();
    cheatcodes::set_contract_address(escrow_address);

    // read definition
    let definition = OTCEscrowContract::get_definition();

    // set cheatcode address back to original
    cheatcodes::set_contract_address(current_contract_address);

    definition
}