use aztec::{
    macros::notes::note,
    oracle::random::random,
    prelude::AztecAddress,
    protocol_types::traits::{Deserialize, Serialize},
};

#[note]
#[derive(Eq, Serialize, Deserialize)]
pub struct DefinitionNote {
    owner: AztecAddress,
    partial_note: Field,
    sell_token_address: AztecAddress,
    sell_token_amount: u128,
    buy_token_address: AztecAddress,
    buy_token_amount: u128,
}

impl DefinitionNote {
    pub fn new(
        owner: AztecAddress,
        partial_note: Field,
        sell_token_address: AztecAddress,
        sell_token_amount: u128,
        buy_token_address: AztecAddress,
        buy_token_amount: u128,
    ) -> Self {
        DefinitionNote {
            owner,
            partial_note,
            sell_token_address,
            sell_token_amount,
            buy_token_address,
            buy_token_amount,
        }
    }
}
