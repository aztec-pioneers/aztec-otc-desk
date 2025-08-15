#!/usr/bin/env bash
set -euo pipefail

install_aztec() {
  local version=$1

  local aztec_path="$HOME/.aztec/v$version/bin"

  if [[ ! -f "$aztec_path/aztec" ]]; then
    echo "Installing aztec $version in $aztec_path"
    VERSION=$version BIN_PATH=$aztec_path NON_INTERACTIVE=1 bash -i <(curl -s https://install.aztec.network)
  fi
}

AZTEC_VERSION="1.1.2"
install_aztec $AZTEC_VERSION
AZTEC="$HOME/.aztec/v$AZTEC_VERSION/bin/aztec"
AZTEC_NARGO="$HOME/.aztec/v$AZTEC_VERSION/bin/aztec-nargo"
