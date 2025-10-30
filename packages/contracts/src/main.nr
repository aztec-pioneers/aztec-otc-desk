use aztec::macros::aztec;

pub mod types;
pub mod test;

#[aztec]
pub contract OTCEscrow {
    // imports
    use aztec::{
        macros::{
            functions::{initializer, external},
            storage::storage
        },
        messages::message_delivery::MessageDelivery,
        protocol_types::address::AztecAddress,
        state_vars::PrivateImmutable
    };
    use token_contract::Token;
    use crate::types::config_note::ConfigNote;


    #[storage]
    struct Storage<Context> {
        config: PrivateImmutable<ConfigNote, Context>,
    }
    
    #[external("private")]
    #[initializer]
    fn constructor(
        sell_token_address: AztecAddress,
        sell_token_amount: u128,
        buy_token_address: AztecAddress,
        buy_token_amount: u128,
    ) {
        let self_address = context.this_address();

        // create partial note
        let partial_note = Token::at(buy_token_address)
            .initialize_transfer_commitment(
                self_address,
                self_address
            ).call(&mut context);

        // Create config note
        let config = ConfigNote::new(
            self_address,
            partial_note,
            sell_token_address,
            sell_token_amount,
            buy_token_address,
            buy_token_amount
        );
        
        storage.config
            .initialize(config)
            .emit(self_address, MessageDelivery.CONSTRAINED_ONCHAIN);
    }
    
    /**
     * OTC Offer Maker deposits tokens into the shared escrow
     *
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     * @return - the commitment for the partial note
     */
    #[external("private")]
    fn deposit_tokens(_nonce: Field) {
        let config = storage.config.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender().unwrap();

        // transfer tokens in
        Token::at(config.sell_token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                config.sell_token_amount,
                _nonce
            )
            .call(&mut context);

        // emit nullifier to prevent multiple deposits
        let deposit_nullifier = config.get_nullifier(true);
        context.push_nullifier(deposit_nullifier);
    }

    /**
     * Fulfil an OTC order as a taker by transfering in the asked tokens and withdrawing the offered tokens
     *
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     */
    #[external("private")]
    fn fill_order(_nonce: Field) {
        let config = storage.config.get_note();
        let self_address = context.this_address();
        let caller = context.msg_sender().unwrap();

        // transfer ask tokens in
        Token::at(config.buy_token_address)
            .transfer_private_to_private(
                caller,
                self_address,
                config.buy_token_amount,
                _nonce
            )
            .call(&mut context);

        Token::at(config.buy_token_address)
            .transfer_private_to_commitment(
                self_address,
                config.partial_note,
                config.buy_token_amount,
                0
            )
            .call(&mut context);

        // transfer offer tokens out
        Token::at(config.sell_token_address)
            .transfer_private_to_private(
                self_address,
                caller,
                config.sell_token_amount,
                0
            )
            .call(&mut context);

        // emit nullifier to prevent multiple fills
        let fill_nullifier = config.get_nullifier(false);
        context.push_nullifier(fill_nullifier);
    }

    #[external("utility")]
    unconstrained fn get_config() -> ConfigNote {
        storage.config.view_note()
    }
}
