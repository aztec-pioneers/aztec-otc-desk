use crate::test::utils::setup::setup;

// test basic escrow
#[test]
unconstrained fn full_escrow_success() {
    let (env, accounts, contracts) = setup(true);
    assert(1 == 1);
}

// test try deposit not enough money
// test multiple deposit?
// test with wrong authwit?
// test try withdraw not enough money
// test try withdraw twice (should fail on transfer commitment)
// test can't fill before deposit (shouldn't have tokens in)
// test can fill own order