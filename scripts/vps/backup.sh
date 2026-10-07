#!/bin/sh
# Full Haulyard snapshot: Postgres + local uploads + .env.prod
# Keeps /root/backups/haulyard-*.tar.gz for 14 days.
# Cron (nightly 03:00):  0 3 * * * /root/fleetos/scripts/vps/backup.sh >> /var/log/haulyard-backup.log 2>&1
set -eu

KEEP_DAYS=14
OUT_DIR="${HAULYARD_BACKUP_DIR:-/root/backups}"
DB_CONTAINER="${DB_CONTAINER:-haulyard-prod-db}"
API_CONTAINER="${API_CONTAINER:-haulyard-prod-api}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
STAMP=$(date +%Y%m%d-%H%M)
WORK="$OUT_DIR/haulyard-$STAMP"
ARCHIVE="$OUT_DIR/haulyard-$STAMP.tar.gz"

mkdir -p "$WORK"
chmod 700 "$OUT_DIR"

if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  echo "Database container $DB_CONTAINER is not running"
  rm -rf "$WORK"
  exit 1
fi

echo "Dumping Postgres..."
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$WORK/fleetos.sql"

echo "Archiving uploads..."
if docker inspect "$API_CONTAINER" >/dev/null 2>&1; then
  docker exec "$API_CONTAINER" sh -c 'tar czf - -C /app/apps/api/uploads .' > "$WORK/uploads.tar.gz" || \
    printf '' > "$WORK/uploads.tar.gz"
else
  printf '' > "$WORK/uploads.tar.gz"
fi

if [ -f "$REPO_ROOT/infrastructure/.env.prod" ]; then
  cp "$REPO_ROOT/infrastructure/.env.prod" "$WORK/env.prod"
  chmod 600 "$WORK/env.prod"
fi

echo "Packing $ARCHIVE..."
tar czf "$ARCHIVE" -C "$OUT_DIR" "haulyard-$STAMP"
chmod 600 "$ARCHIVE"
rm -rf "$WORK"
ln -sfn "$ARCHIVE" "$OUT_DIR/haulyard-latest.tar.gz"

find "$OUT_DIR" -maxdepth 1 -type f -name 'haulyard-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backup ready: $ARCHIVE ($(du -h "$ARCHIVE" | awk '{print $1}'))"
