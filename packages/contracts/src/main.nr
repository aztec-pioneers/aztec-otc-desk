use aztec::macros::aztec;
pub mod types;

#[aztec]
pub contract OTCEscrowContract {
    // aztec library imports
    use aztec::{
        macros::{
            events::event,
            functions::{initializer, private, utility},
            storage::storage
        },
        prelude::{AztecAddress, PrivateImmutable, PrivateMutable},
        messages::logs::note::encode_and_encrypt_note,
        protocol_types::traits::ToField,
        event::event_interface::{emit_event_in_private_log, PrivateLogContent},
    };
    use crate::types::{
        definition_note::DefinitionNote,
        maker_note::MakerNote
    };

    use poseidon::poseidon2::Poseidon2;
    use token_contract::Token;
    
    #[event]
    struct MakerPartialNote {
        commitment: Field
    }

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
    
    /**
     * OTC Offer Maker deposits tokens into the shared escrow
     *
     * @param maker_secret - the secret value used to bind the market maker
     *                       retrieve with `get_maker_secret` to avoid extra work
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     * @return - the commitment for the partial note
     */
    #[private]
    fn deposit_tokens(maker_secret: Field, _nonce: Field) -> Field {

        let self_address = context.this_address();
        let caller = context.msg_sender();

        // check maker commitment
        let definition = storage.definition.get_note();
        let preimage = [maker_address.to_field(), maker_secret];
        let maker_commitment = Poseidon2::hash(preimage, 2);
        definition.check_commitment(maker_commitment);

        // transfer tokens in
        Token::at(definition.offer_token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                definition.offer_token_amount,
                _nonce
            )
            .call(&mut context);

        let transfer_commitment = Token::at(definition.ask_token_address)
            .initialize_transfer_commitment(
                self_address,
                caller,
                self_address
            ).call(&mut context);

        emit_event_in_private_log(
            MakerPartialNote { commitment: transfer_commitment },
            &mut context,
            self_address,
            self_address,
            PrivateLogContent.NO_CONSTRAINTS,
        );

        transfer_commitment
    }

    /**
     * Fulfil an OTC order as a taker by transfering in the asked tokens and withdrawing the offered tokens
     *
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     */
    #[private]
    fn fill_order(_nonce: Field, commitment: Field) {
        let definition = storage.definition.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender();

        // transfer ask tokens in
        Token::at(definition.ask_token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                definition.ask_token_amount,
                _nonce
            )
            .call(&mut context);

        Token::at(definition.ask_token_address)
            .transfer_private_to_commitment(
                self_address,
                commitment,
                definition.ask_token_amount,
                0
            )
            .call(&mut context);

        // transfer offer tokens out
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
    pub unconstrained fn get_maker_secret() -> Field {
        storage.maker_secret.view_note().secret
    }

    #[contract_library_method]
    pub fn compute_maker_commitment(maker_address: AztecAddress, maker_secret: Field) -> Field {
        
    }
}
