#!/bin/sh
# Remove all settlement statements (DRAFT, FINALIZED, PAID). Keeps loads, drivers, deductions, credits.
#
# Usage (on VPS from repo root):
#   sh scripts/vps/cleanup-settlements.sh
#   CONFIRM=yes sh scripts/vps/cleanup-settlements.sh
#
# Optional: limit to one company
#   sh scripts/vps/cleanup-settlements.sh --company-id <uuid>
#
# Dry-run by default. Set CONFIRM=yes to execute deletes.

set -e

COMPANY_ID=""
DB_CONTAINER="${DB_CONTAINER:-haulyard-prod-db}"
API_CONTAINER="${API_CONTAINER:-haulyard-prod-api}"
DB_USER="${POSTGRES_USER:-haulyard}"
DB_NAME="${POSTGRES_DB:-haulyard}"

while [ $# -gt 0 ]; do
  case "$1" in
    --company-id) COMPANY_ID="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

S_WHERE=""
S_FILTER=""
if [ -n "$COMPANY_ID" ]; then
  S_WHERE="WHERE s.\"companyId\" = '$COMPANY_ID'"
  S_FILTER="AND s.\"companyId\" = '$COMPANY_ID'"
  echo "Company filter: $COMPANY_ID"
else
  echo "Company filter: all companies in database"
fi
echo ""

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

echo "Settlements to delete (up to 20):"
psql_exec <<SQL
SELECT
  s.id,
  s."statementNumber",
  s.status,
  s."periodStart"::date AS week_start,
  s."periodEnd"::date AS week_end,
  d."firstName" || ' ' || d."lastName" AS driver
FROM settlements s
JOIN drivers d ON d.id = s."driverId"
$S_WHERE
ORDER BY s."createdAt" DESC
LIMIT 20;
SQL

echo ""
echo "Counts:"
psql_exec <<SQL
SELECT
  (SELECT COUNT(*) FROM settlements s $S_WHERE) AS settlements,
  (SELECT COUNT(*) FROM settlements s WHERE s.status = 'DRAFT' $S_FILTER) AS draft,
  (SELECT COUNT(*) FROM settlements s WHERE s.status = 'FINALIZED' $S_FILTER) AS finalized,
  (SELECT COUNT(*) FROM settlements s WHERE s.status = 'PAID' $S_FILTER) AS paid,
  (SELECT COUNT(*) FROM settlement_lines sl
   JOIN settlements s ON s.id = sl."settlementId"
   WHERE TRUE $S_FILTER) AS settlement_lines,
  (SELECT COUNT(*) FROM loads) AS loads_kept;
SQL

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Dry run only. Loads/drivers/deductions are kept. Re-run with CONFIRM=yes to delete all settlements."
  exit 0
fi

TX_COUNT=$(psql_exec -t -A -c "SELECT COUNT(*)::text FROM settlements s $S_WHERE;")

if [ "$TX_COUNT" = "0" ]; then
  echo "Nothing to delete."
  exit 0
fi

echo ""
echo "Deleting $TX_COUNT settlement(s)..."
psql_exec <<SQL
BEGIN;
DELETE FROM settlements s
$S_WHERE;
COMMIT;
SQL

echo ""
echo "Cleaning settlement PDF files from API uploads..."
if docker ps --format '{{.Names}}' | grep -qx "$API_CONTAINER"; then
  docker exec "$API_CONTAINER" sh -c 'rm -f /app/apps/api/uploads/settlements/*.pdf 2>/dev/null || true'
  echo "PDF cleanup done."
else
  echo "API container not found ($API_CONTAINER) — skip PDF cleanup."
fi

echo ""
echo "Done. Remaining settlements:"
psql_exec -c "SELECT COUNT(*) AS settlements_remaining FROM settlements s $S_WHERE;"
