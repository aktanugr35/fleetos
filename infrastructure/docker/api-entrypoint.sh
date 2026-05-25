#!/bin/sh
set -e
cd /app
echo "Applying database migrations..."
if [ ! -x ./node_modules/.bin/prisma ]; then
  echo "ERROR: prisma CLI missing in image (node_modules/.bin/prisma)"
  exit 1
fi
./node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma
echo "Starting FleetOS API..."
exec node apps/api/dist/index.js
