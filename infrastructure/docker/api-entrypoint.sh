#!/bin/sh
set -e
cd /app
echo "Applying database migrations..."
pnpm --filter @fleetos/api exec prisma migrate deploy
echo "Starting FleetOS API..."
exec node apps/api/dist/index.js
