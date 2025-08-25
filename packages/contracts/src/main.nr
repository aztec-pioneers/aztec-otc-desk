use aztec::macros::aztec;
pub mod types;

#[aztec]
pub contract DemoContract {
    // aztec library imports
    use aztec::{
        macros::{functions::{initializer, private, utility}, storage::storage},
        prelude::{AztecAddress, PrivateImmutable},
            messages::logs::note::encode_and_encrypt_note,

    };
    use crate::types::definition_note::DefinitionNote;
    use token_contract::Token;

    #[storage]
    struct Storage<Context> {
        definition: PrivateImmutable<DefinitionNote, Context>,
    }
    
    #[private]
    #[initializer]
    fn constructor_self_owned(token_address: AztecAddress, token_amount: u128) {
        let self_address = context.this_address();
        let definition = DefinitionNote::new(
            self_address,
            token_address,
            token_amount
        );
        storage.definition.initialize(definition).emit(encode_and_encrypt_note(
          &mut context,
            self_address,
            self_address
        ));
    }

    #[private]
    #[initializer]
    fn constructor_sender_owned(token_address: AztecAddress, token_amount: u128) {
        let definition = DefinitionNote::new(
            context.msg_sender(),
            token_address,
            token_amount
        );
        storage.definition.initialize(definition).emit(encode_and_encrypt_note(
          &mut context,
            context.msg_sender(),
            context.msg_sender(),
        ));
    }

    #[private]
    fn transfer_in(_nonce: Field) {
        let definition = storage.definition.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender();
        Token::at(definition.token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                definition.token_amount,
                _nonce,
            )
            .call(&mut context);
    }

    #[private]
    fn transfer_out() {
        let definition = storage.definition.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender();
        Token::at(definition.token_address)
            .transfer_private_to_private(
                self_address,
                caller,
                definition.token_amount,
                0
            )
            .call(&mut context);
    }

    #[utility]
    pub unconstrained fn get_definition() -> DefinitionNote {
        storage.definition.view_note()
    }
}
