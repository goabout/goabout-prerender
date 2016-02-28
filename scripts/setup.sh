#!/bin/sh

set -e

dirname=`dirname "$0"`
cd "$dirname/.."
echo "PHASE: Setup..."

npm install
