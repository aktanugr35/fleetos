#!/bin/sh
set -e
cd "$(dirname "$0")/../.."

echo "Applying database migrations..."
PRISMA_BIN=$(find node_modules -path '*/prisma/build/index.js' 2>/dev/null | head -1)
node "$PRISMA_BIN" migrate deploy --schema=apps/api/prisma/schema.prisma

echo "Starting Haulyard API..."
exec pnpm --filter @haulyard/api start
