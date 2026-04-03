// TODO: TXE tests disabled during v3->v4 migration.
// The escrow contract impersonates keys for cross-contract calls which v4 TXE
// rejects with "Key validation request denied". These tests need to be ported
// to JS e2e tests instead.
//
// use token_contract::Token;
// use crate::test::utils::{
//     setup::{setup, USDC_ESCROW_AMOUNT, ETH_ESCROW_AMOUNT},
//     escrow,
//     token
// };
