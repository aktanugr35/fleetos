#!/bin/sh
set -e
cd /app

echo "Applying database migrations..."

PRISMA_BIN=$(find /app/node_modules -path '*/prisma/build/index.js' 2>/dev/null | head -1)

if [ -z "$PRISMA_BIN" ] || [ ! -f "$PRISMA_BIN" ]; then
  echo "ERROR: prisma CLI not found in /app/node_modules"
  exit 1
fi

node "$PRISMA_BIN" migrate deploy --schema=apps/api/prisma/schema.prisma

echo "Starting Haulyard API..."
exec node apps/api/dist/index.js
