use aztec::macros::aztec;

#[aztec]
contract Main {
    use aztec::macros::functions::private;

    #[private]
    fn hello_world() -> Field {
        1
    }
}
