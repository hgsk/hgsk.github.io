#!/usr/bin/env bash
set -eu

if [ -f package.json ]; then
  npm install
  npm run build
fi
