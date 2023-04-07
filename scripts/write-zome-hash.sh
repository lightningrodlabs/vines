#!/bin/bash
set -e

# Script for writing zome hashes to files

echo Executing \"$0\".

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: bin folder path"
  exit 2
fi

binFoloder=$1

# Compute hash of zome
value=`$binFoloder/hash_zome ./target/wasm32-unknown-unknown/release/threads_zome.wasm`
echo "$value" > electron/bin/threads_zome_hash.txt
echo
echo "     THREADS ZOME HASH = $value"
