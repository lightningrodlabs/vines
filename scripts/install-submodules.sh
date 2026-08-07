#!/bin/bash

set -e

# Script for downloading submodule dependencies

echo Executing \"$0\"

# Check pre-conditions
if [ $# != 1 ]; then
  echo 1>&2 "$0: Aborting. Missing argument: Holochain version"
  exit 2
fi

# Takes the full holochain version (config.hc_version in package.json) and derives
# every downstream branch name from it, so the version lives in exactly one place.
hcversion=$1
echo ... for holochain version $hcversion
if [ "$hcversion" == "hc" ] || [ "$hcversion" == "" ] ; then
  echo Missing \"hc_version\" field in \"package.json\".
  exit 1
fi

IFS=. read -r hcmajor hcminor hcpatch <<< "$hcversion"
if [ -z "$hcmajor" ] || [ -z "$hcminor" ] || [ -z "$hcpatch" ]; then
  echo 1>&2 "$0: Aborting. Expected hc_version as MAJOR.MINOR.PATCH, got \"$hcversion\""
  exit 1
fi

filesbranch=hdk-$hcminor.0          # 0.6.1 -> hdk-6.0
zdkbranch=main-$hcmajor.$hcminor    # 0.6.1 -> main-0.6

# Fail with a useful message when upstream has not cut the branch yet, rather
# than a bare clone error.
check_branch () {
  if ! git ls-remote --exit-code --heads "$1" "$2" > /dev/null 2>&1; then
    echo 1>&2 "$0: Aborting. $1 has no branch \"$2\" (derived from hc_version $hcversion)."
    exit 1
  fi
}

filesrepo=https://github.com/lightningrodlabs/files.git
zdkrepo=https://github.com/ddd-mtl/zdk.git

echo Getting branches: $filesbranch \(files\), $zdkbranch \(zdk\)
check_branch $filesrepo $filesbranch
check_branch $zdkrepo $zdkbranch

echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules
cd submodules

echo \* Download Files repo
git clone -b $filesbranch --depth 1 $filesrepo

echo \* Download ZDK repo
git clone -b $zdkbranch --depth 1 $zdkrepo

cd ..
echo
echo \* Done
