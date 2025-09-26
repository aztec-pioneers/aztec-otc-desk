#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"

cp $SCRIPT_DIR/../../../node_modules/@aztec/noir-contracts.js/artifacts/token_contract-Token.json \
    $SCRIPT_DIR/../target/otc_escrow-Token.json

# AZTEC_PACKAGES_DIR=~/nargo/github.com/AztecProtocol/aztec-packages/v3.0.0-nightly.20250923

# # Check that the directory exists
# if [ ! -d "$AZTEC_PACKAGES_DIR" ]; then
#   echo "Error: Directory $AZTEC_PACKAGES_DIR does not exist. Try running `bun run build` first!"
#   exit 1
# fi

# # Build the Noir contract
# cd $AZTEC_PACKAGES_DIR/noir-projects/noir-contracts/contracts/app/token_contract/
# aztec-nargo compile

# # Copy the compiled artifact to the target dir for TXE testing
# cp -r $AZTEC_PACKAGES_DIR/noir-projects/noir-contracts/contracts/app/token_contract/target/* \
#     $SCRIPT_DIR/../target