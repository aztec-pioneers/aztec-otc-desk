#!/usr/bin/env bash
set -euo pipefail

source "$(dirname -- "${BASH_SOURCE[0]}")/../../../scripts/install-aztec.sh"

rm -rf codegenCache.json
$AZTEC_NARGO compile $@

for file in $(find ./target -name "*.json"); do
  # remove `file_map` from the json file
  jq '.file_map = {}' $file >$file.tmp && mv $file.tmp $file
done

ARTIFACTS_DIR=./src/artifacts
rm -rf $ARTIFACTS_DIR
mkdir -p $ARTIFACTS_DIR
if [ -f target/*_circuit.json ]; then
  mv target/*_circuit.json $ARTIFACTS_DIR # move Noir circuits because of https://github.com/AztecProtocol/aztec-packages/issues/14138
fi
$AZTEC codegen ./target -o $ARTIFACTS_DIR --force

rm -rf codegenCache.json "-" # https://github.com/AztecProtocol/aztec-packages/issues/14832
