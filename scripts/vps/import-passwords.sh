#!/bin/sh
# Import portal passwords from Excel into production DB.
# Usage (on VPS, from repo root):
#   sh scripts/vps/import-passwords.sh /path/to/valleysifreguncel.xlsx
#   sh scripts/vps/import-passwords.sh /path/to/file.xlsx --company-slug=your-company-slug
set -e
cd "$(dirname "$0")/../.."

XLSX="${1:?Usage: import-passwords.sh /path/to/file.xlsx [--company-slug=slug] [--replace]}"
shift

if [ ! -f "$XLSX" ]; then
  echo "File not found: $XLSX"
  exit 1
fi

CONTAINER="${API_CONTAINER:-haulyard-prod-api}"
REMOTE_PATH="/tmp/import-passwords.xlsx"

echo "Copying Excel into $CONTAINER..."
docker cp "$XLSX" "$CONTAINER:$REMOTE_PATH"

echo "Running import..."
docker exec "$CONTAINER" node apps/api/dist/cli/import-passwords.js "$REMOTE_PATH" "$@"

echo "Done. Open Passwords in the panel to verify 22 entries."
