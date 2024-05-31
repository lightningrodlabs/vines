#!/bin/bash

set -e

# Script for downloading submodule dependencies

echo Executing \"$0\".

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: holochain version"
  exit 2
fi

hcversion=$1
echo for holochain version $hcversion

if [ "$hcversion" == "hc" ] || [ "$hcversion" == "" ] ; then
  echo Missing \"hc-version\" field in \"package.json\".
  exit 1
fi

echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules
cd submodules

echo \* Download Files repo: WARNING HARDCODED branch name
git clone -b hdk-4.0 --depth 1 https://github.com/lightningrodlabs/files.git

echo \* Download latest install scripts
git clone --depth 1 https://github.com/ddd-mtl/hc-prebuilt


cd ..
echo
echo \* Done
