#!/bin/bash

# compile token contract
git submodule update --init --recursive
cd deps/aztec-standards
aztec-nargo compile --package token_contract

# generate TypeScript bindings
aztec codegen ./target/token_contract-Token.json \
    -o ../../packages/contracts/artifacts -f

# add the artifact to the target file for txe
if [ ! -d "../../packages/contracts/target" ]; then
    mkdir ../../packages/contracts/target
fi
cp ./target/token_contract-Token.json ../../packages/contracts/target

