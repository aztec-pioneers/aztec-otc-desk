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
    token_address: AztecAddress,
    token_amount: u128,
}

impl DefinitionNote {
    pub fn new(
        owner: AztecAddress,
        token_address: AztecAddress,
        token_amount: u128,
    ) -> Self {
        DefinitionNote {
            owner,
            token_address,
            token_amount,
        }
    }
}
