#!/bin/sh
set -e
cd "$(dirname "$0")/../.."

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "Starting FleetOS API..."
exec pnpm --filter @fleetos/api start
