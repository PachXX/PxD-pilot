#!/usr/bin/env bash

set -euo pipefail

REPOSITORY_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)

cd "$REPOSITORY_ROOT"

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

echo "Generating declaration-only workspace dependencies for twenty-server"

npx tsgo \
  -p packages/twenty-shared/tsconfig.lib.json \
  --declaration \
  --emitDeclarationOnly \
  --noEmit false \
  --outDir packages/twenty-shared/dist \
  --rootDir packages/twenty-shared/src
npx tsc-alias \
  -p packages/twenty-shared/tsconfig.lib.json \
  --outDir packages/twenty-shared/dist

npx tsgo \
  -p packages/twenty-emails/tsconfig.lib.json \
  --declaration \
  --emitDeclarationOnly \
  --noEmit false \
  --outDir packages/twenty-emails/dist \
  --rootDir packages/twenty-emails/src \
  --composite false
npx tsc-alias \
  -p packages/twenty-emails/tsconfig.lib.json \
  --outDir packages/twenty-emails/dist

npx tsgo \
  -p packages/twenty-client-sdk/tsconfig.lib.json \
  --declaration \
  --emitDeclarationOnly \
  --noEmit false \
  --outDir packages/twenty-client-sdk/dist \
  --rootDir packages/twenty-client-sdk/src
npx tsc-alias \
  -p packages/twenty-client-sdk/tsconfig.lib.json \
  --outDir packages/twenty-client-sdk/dist

npx tsc -p packages/pashx-mab-contract/tsconfig.lib.json

echo "Running twenty-server tsc --noEmit"

npx tsc \
  --noEmit \
  --incremental false \
  --pretty false \
  -p packages/twenty-server/tsconfig.typecheck.json
