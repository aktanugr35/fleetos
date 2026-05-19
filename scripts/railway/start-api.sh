#!/bin/sh
set -e
cd "$(dirname "$0")/../.."

echo "Applying database migrations..."
pnpm --filter @fleetos/api exec prisma migrate deploy

echo "Starting FleetOS API..."
exec pnpm --filter @fleetos/api start
