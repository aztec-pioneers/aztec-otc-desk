#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd $SCRIPT_DIR/../

## Set the SED utility depending on OSX or Linix
if command -v gsed &> /dev/null
then
    # Set variable for gsed (OSX typically)
    sed_cmd='gsed'
else
    # Set variable for sed (Linux typically)
    sed_cmd='sed'
fi

# Move the escrow artifacts
cp ./target/otc_es/crow-OTCEscrowContract.json ./ts/src/artifacts/escrow/OTCEscrowContract.json
cp ./artifacts/OTCEscrowContract.ts ./ts/src/artifacts/escrow/OTCEscrowContract.ts

# Move the token artifacts
cp ../../deps/aztec-standards/target/token_contract-Token.json ./ts/src/artifacts/token/Token.json
cp ./artifacts/Token.ts ./ts/src/artifacts/token/Token.ts

# Fix imports
$sed_cmd -i "s|../target/otc_escrow-OTCEscrowContract.json|./OTCEscrowContract.json|" ./ts/src/artifacts/escrow/OTCEscrowContract.ts
$sed_cmd -i "s|../../../deps/aztec-standards/target/token_contract-Token.json|./Token.json|" ./ts/src/artifacts/token/Token.ts
