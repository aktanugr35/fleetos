#!/bin/sh
# Restore a snapshot from /root/backups/haulyard-YYYYMMDD-HHMM.tar.gz
# This replaces the live database. Site will be down briefly.
# Usage: sh scripts/vps/restore.sh /root/backups/haulyard-20260923-0300.tar.gz
set -eu

ARCHIVE="${1:?Usage: restore.sh /root/backups/haulyard-YYYYMMDD-HHMM.tar.gz}"
DB_CONTAINER="${DB_CONTAINER:-haulyard-prod-db}"
API_CONTAINER="${API_CONTAINER:-haulyard-prod-api}"
WORK=$(mktemp -d)

if [ ! -f "$ARCHIVE" ]; then
  echo "File not found: $ARCHIVE"
  exit 1
fi

echo "This replaces ALL live Haulyard data with $ARCHIVE"
echo "Type RESTORE to continue:"
read -r confirm
if [ "$confirm" != "RESTORE" ]; then
  echo "Cancelled"
  rm -rf "$WORK"
  exit 1
fi

tar xzf "$ARCHIVE" -C "$WORK"
INNER=$(find "$WORK" -mindepth 1 -maxdepth 1 -type d | head -1)
if [ -z "$INNER" ] || [ ! -f "$INNER/fleetos.sql" ]; then
  echo "Archive is missing fleetos.sql"
  rm -rf "$WORK"
  exit 1
fi

echo "Restoring Postgres..."
docker exec -i "$DB_CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$INNER/fleetos.sql"

if [ -s "$INNER/uploads.tar.gz" ]; then
  echo "Restoring uploads..."
  docker exec -i "$API_CONTAINER" sh -c 'tar xzf - -C /app/apps/api/uploads' < "$INNER/uploads.tar.gz"
fi

rm -rf "$WORK"
echo "Restore finished. Log in with the account that existed in the backup."
