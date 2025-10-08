use aztec::{
    macros::notes::note,
    oracle::random::random,
    protocol_types::{
        traits::{Deserialize, Serialize, Packable},
        address::AztecAddress,
    },  
};
use poseidon::poseidon2::Poseidon2;


#[derive(Eq, Serialize, Deserialize, Packable)]
#[note]
pub struct DefinitionNote {
    pub owner: AztecAddress,
    pub partial_note: Field,
    pub sell_token_address: AztecAddress,
    pub sell_token_amount: u128,
    pub buy_token_address: AztecAddress,
    pub buy_token_amount: u128,
    pub randomness: Field,
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
            randomness: unsafe { random() }
        }
    }

    pub fn get_nullifier(self) -> Field {
        let preimage = self.serialize();
        Poseidon2::hash(preimage, 7)
    }
}
