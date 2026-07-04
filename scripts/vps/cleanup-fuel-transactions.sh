#!/bin/sh
# Remove all fuel transaction entries (keeps fuel cards, trucks, settlements).
#
# Usage (on VPS from repo root):
#   sh scripts/vps/cleanup-fuel-transactions.sh
#   CONFIRM=yes sh scripts/vps/cleanup-fuel-transactions.sh
#
# Optional: limit to one company
#   sh scripts/vps/cleanup-fuel-transactions.sh --company-id <uuid>
#
# Dry-run by default. Set CONFIRM=yes to execute deletes.

set -e

COMPANY_ID=""
DB_CONTAINER="${DB_CONTAINER:-fleetos-prod-db}"
DB_USER="${POSTGRES_USER:-fleetos}"
DB_NAME="${POSTGRES_DB:-fleetos}"

while [ $# -gt 0 ]; do
  case "$1" in
    --company-id) COMPANY_ID="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

FT_WHERE=""
SFT_WHERE=""
if [ -n "$COMPANY_ID" ]; then
  FT_WHERE="WHERE ft.\"companyId\" = '$COMPANY_ID'"
  SFT_WHERE="WHERE ft.\"companyId\" = '$COMPANY_ID'"
  FC_WHERE="WHERE \"companyId\" = '$COMPANY_ID'"
  echo "Company filter: $COMPANY_ID"
else
  FC_WHERE=""
  echo "Company filter: all companies in database"
fi
echo ""

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

echo "Fuel transactions to delete (up to 20):"
psql_exec <<SQL
SELECT ft.id, ft.date::date AS day, ft.merchant, ft."netAmount", t."unitNumber" AS truck
FROM fuel_transactions ft
LEFT JOIN trucks t ON t.id = ft."truckId"
$FT_WHERE
ORDER BY ft.date DESC
LIMIT 20;
SQL

echo ""
echo "Counts:"
psql_exec <<SQL
SELECT
  (SELECT COUNT(*) FROM fuel_transactions ft $FT_WHERE) AS fuel_transactions,
  (SELECT COUNT(*)
   FROM settlement_fuel_transactions sft
   JOIN fuel_transactions ft ON ft.id = sft."fuelTransactionId"
   $SFT_WHERE) AS settlement_links,
  (SELECT COUNT(*) FROM fuel_cards $FC_WHERE) AS fuel_cards_kept;
SQL

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Dry run only. Fuel cards are kept. Re-run with CONFIRM=yes to delete all fuel transactions."
  exit 0
fi

TX_COUNT=$(psql_exec -t -A -c "SELECT COUNT(*)::text FROM fuel_transactions ft $FT_WHERE;")

if [ "$TX_COUNT" = "0" ]; then
  echo "Nothing to delete."
  exit 0
fi

echo ""
echo "Deleting $TX_COUNT fuel transaction(s)..."
psql_exec <<SQL
BEGIN;

DELETE FROM settlement_fuel_transactions sft
USING fuel_transactions ft
WHERE sft."fuelTransactionId" = ft.id
$([ -n "$COMPANY_ID" ] && echo "AND ft.\"companyId\" = '$COMPANY_ID'");

DELETE FROM fuel_transactions ft
$FT_WHERE;

COMMIT;
SQL

echo ""
echo "Done. Remaining fuel transactions:"
psql_exec -c "SELECT COUNT(*) AS fuel_transactions_remaining FROM fuel_transactions ft $FT_WHERE;"
