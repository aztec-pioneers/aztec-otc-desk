use aztec::macros::aztec;
pub mod types;

#[aztec]
pub contract DemoContract {
    // aztec library imports
    use aztec::{
        macros::{
            functions::{initializer, private, utility},
            storage::storage
        },
        prelude::{AztecAddress, PrivateImmutable},
        messages::logs::note::encode_and_encrypt_note,
    };
    use crate::types::{
        definition_note::DefinitionNote,
        maker_note::MakerNote
    };

    use token_contract::Token;

    #[storage]
    struct Storage<Context> {
        definition: PrivateImmutable<DefinitionNote, Context>,
        maker_secret: PrivateImmutable<MakerNote, Context>,
    }
    
    #[private]
    #[initializer]
    fn constructor(
        offer_token_address: AztecAddress,
        offer_token_amount: u128,
        ask_token_address: AztecAddress,
        ask_token_amount: u128,
    ) {
        // Create a maker secret note
        //      This note is only shared with the contract deployer
        //      OTC Escrow order maker. It is used to store a secret
        //      factor used to constrain access to the sell side of
        //      the order
        let caller = context.msg_sender();
        let maker_note = MakerNote::new(caller);
        storage.maker_secret.initialize(maker_note).emit(encode_and_encrypt_note(
            &mut context,
            context.msg_sender(),
            context.msg_sender()
        ));
       
        // Create definition note
        let self_address = context.this_address();
        let definition = DefinitionNote::new(
            self_address,
            maker_note.commitment(),
            offer_token_address,
            offer_token_amount,
            ask_token_address,
            ask_token_amount
        );
        storage.definition.initialize(definition).emit(encode_and_encrypt_note(
            &mut context,
            self_address,
            self_address
        ));
    }

    #[private]
    fn transfer_in_offered_token(_nonce: Field) {
        let definition = storage.definition.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender();
        Token::at(definition.offer_token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                definition.offer_token_amount,
                _nonce,
            )
            .call(&mut context);
    }

    #[private]
    fn transfer_out_offered_token() {
        let definition = storage.definition.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender();
        Token::at(definition.offer_token_address)
            .transfer_private_to_private(
                self_address,
                caller,
                definition.offer_token_amount,
                0
            )
            .call(&mut context);
    }

    #[utility]
    pub unconstrained fn get_definition() -> DefinitionNote {
        storage.definition.view_note()
    }

    #[utility]
    pub unconstrained fn get_maker_secret() -> MakerNote {
        storage.maker_secret.view_note()
    }
}
