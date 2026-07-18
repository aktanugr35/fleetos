#!/bin/sh
# Remove all toll transaction entries (keeps toll devices, trucks, settlements).
#
# Usage (on VPS from repo root):
#   sh scripts/vps/cleanup-toll-transactions.sh
#   CONFIRM=yes sh scripts/vps/cleanup-toll-transactions.sh
#
# Optional: limit to one company
#   sh scripts/vps/cleanup-toll-transactions.sh --company-id <uuid>
#
# Dry-run by default. Set CONFIRM=yes to execute deletes.

set -e

COMPANY_ID=""
DB_CONTAINER="${DB_CONTAINER:-haulyard-prod-db}"
DB_USER="${POSTGRES_USER:-haulyard}"
DB_NAME="${POSTGRES_DB:-haulyard}"

while [ $# -gt 0 ]; do
  case "$1" in
    --company-id) COMPANY_ID="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

TT_WHERE=""
STT_WHERE=""
if [ -n "$COMPANY_ID" ]; then
  TT_WHERE="WHERE tt.\"companyId\" = '$COMPANY_ID'"
  STT_WHERE="WHERE tt.\"companyId\" = '$COMPANY_ID'"
  TD_WHERE="WHERE \"companyId\" = '$COMPANY_ID'"
  echo "Company filter: $COMPANY_ID"
else
  TD_WHERE=""
  echo "Company filter: all companies in database"
fi
echo ""

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

echo "Toll transactions to delete (up to 20):"
psql_exec <<SQL
SELECT tt.id, tt.date::date AS day, tt.agency, tt.location, tt.amount, t."unitNumber" AS truck
FROM toll_transactions tt
LEFT JOIN trucks t ON t.id = tt."truckId"
$TT_WHERE
ORDER BY tt.date DESC
LIMIT 20;
SQL

echo ""
echo "Counts:"
psql_exec <<SQL
SELECT
  (SELECT COUNT(*) FROM toll_transactions tt $TT_WHERE) AS toll_transactions,
  (SELECT COUNT(*)
   FROM settlement_toll_transactions stt
   JOIN toll_transactions tt ON tt.id = stt."tollTransactionId"
   $STT_WHERE) AS settlement_links,
  (SELECT COUNT(*) FROM toll_devices $TD_WHERE) AS toll_devices_kept;
SQL

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Dry run only. Toll devices are kept. Re-run with CONFIRM=yes to delete all toll transactions."
  exit 0
fi

TX_COUNT=$(psql_exec -t -A -c "SELECT COUNT(*)::text FROM toll_transactions tt $TT_WHERE;")

if [ "$TX_COUNT" = "0" ]; then
  echo "Nothing to delete."
  exit 0
fi

echo ""
echo "Deleting $TX_COUNT toll transaction(s)..."
psql_exec <<SQL
BEGIN;

DELETE FROM settlement_toll_transactions stt
USING toll_transactions tt
WHERE stt."tollTransactionId" = tt.id
$([ -n "$COMPANY_ID" ] && echo "AND tt.\"companyId\" = '$COMPANY_ID'");

DELETE FROM toll_transactions tt
$TT_WHERE;

COMMIT;
SQL

echo ""
echo "Done. Remaining toll transactions:"
psql_exec -c "SELECT COUNT(*) AS toll_transactions_remaining FROM toll_transactions tt $TT_WHERE;"
