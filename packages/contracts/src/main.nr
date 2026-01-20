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
        state_vars::SinglePrivateImmutable
    };
    use token_contract::Token;
    use crate::types::config_note::ConfigNote;


    #[storage]
    struct Storage<Context> {
        config: SinglePrivateImmutable<ConfigNote, Context>,
    }
    
    #[external("private")]
    #[initializer]
    fn constructor(
        sell_token_address: AztecAddress,
        sell_token_amount: u128,
        buy_token_address: AztecAddress,
        buy_token_amount: u128,
    ) {

        // create partial note
        let partial_note = self.call(Token::at(buy_token_address)
            .initialize_transfer_commitment(
                self.address,
                self.address
            ));

        // Create config note
        let config = ConfigNote::new(
            self.address,
            partial_note,
            sell_token_address,
            sell_token_amount,
            buy_token_address,
            buy_token_amount
        );
        
        self.storage.config
            .initialize(config)
            .deliver(MessageDelivery.CONSTRAINED_ONCHAIN);
    }
    
    /**
     * OTC Offer Maker deposits tokens into the shared escrow
     *
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     * @return - the commitment for the partial note
     */
    #[external("private")]
    fn deposit_tokens(_nonce: Field) {
        let config = self.storage.config.get_note();
        let caller = self.msg_sender().expect(f"Caller not defined");

        // transfer tokens in
        self.call(Token::at(config.sell_token_address)
            .transfer_private_to_private(
                caller,
                self.address,
                config.sell_token_amount,
                _nonce
            ));

        // emit nullifier to prevent multiple deposits
        let deposit_nullifier = self.storage.config.get_note().get_nullifier(true);
        self.context.push_nullifier(deposit_nullifier);
    }

    /**
     * Fulfil an OTC order as a taker by transfering in the asked tokens and withdrawing the offered tokens
     *
     * @param _nonce - authwit nonce used in `transfer_private_to_private`
     */
    #[external("private")]
    fn fill_order(_nonce: Field) {
        let config = self.storage.config.get_note();
        let caller = self.msg_sender().expect(f"Caller not defined");

        // transfer ask tokens in
        self.call(Token::at(config.buy_token_address)
            .transfer_private_to_private(
                caller,
                self.address,
                config.buy_token_amount,
                _nonce
            ));

        self.call(Token::at(config.buy_token_address)
            .transfer_private_to_commitment(
                self.address,
                config.partial_note,
                config.buy_token_amount,
                0
            ));

        // transfer offer tokens out
        self.call(Token::at(config.sell_token_address)
            .transfer_private_to_private(
                self.address,
                caller,
                config.sell_token_amount,
                0
            ));

        // emit nullifier to prevent multiple fills
        let fill_nullifier = config.get_nullifier(false);
        self.context.push_nullifier(fill_nullifier);
    }

    #[external("utility")]
    unconstrained fn get_config() -> ConfigNote {
       self.storage.config.view_note()
    }
}
