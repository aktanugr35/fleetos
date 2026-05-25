#!/bin/sh
# Run on VPS from repo root after editing infrastructure/.env.prod
set -e
cd "$(dirname "$0")/../.."

if [ ! -f infrastructure/.env.prod ]; then
  echo "Missing infrastructure/.env.prod — copy from infrastructure/.env.prod.example"
  exit 1
fi

docker compose -f infrastructure/docker-compose.prod.yml --env-file infrastructure/.env.prod up --build -d

echo ""
echo "Health checks:"
curl -sf "http://127.0.0.1:3001/health" && echo " API OK" || echo " API FAILED"
curl -sf -o /dev/null "http://127.0.0.1:3000" && echo " Web OK" || echo " Web FAILED"
echo "Configure Nginx: infrastructure/nginx/fleetos.conf.example"
