#!/bin/sh
# Remove all loads and settlements for a driver (keeps driver record, deductions, truck, etc.)
#
# Usage (on VPS from repo root):
#   sh scripts/vps/cleanup-driver-loads-settlements.sh --first Anil --last Aktan
#   CONFIRM=yes sh scripts/vps/cleanup-driver-loads-settlements.sh --first Anil --last Aktan
#
# Dry-run by default — prints matched driver + counts. Set CONFIRM=yes to execute deletes.

set -e

FIRST=""
LAST=""
DB_CONTAINER="${DB_CONTAINER:-fleetos-prod-db}"
DB_USER="${POSTGRES_USER:-fleetos}"
DB_NAME="${POSTGRES_DB:-fleetos}"

while [ $# -gt 0 ]; do
  case "$1" in
    --first) FIRST="$2"; shift 2 ;;
    --last) LAST="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [ -z "$FIRST" ] || [ -z "$LAST" ]; then
  echo "Usage: CONFIRM=yes $0 --first <FirstName> --last <LastName>"
  exit 1
fi

# ASCII args; SQL normalizes Turkish ı/İ for matching (Anıl -> anil, Memiş -> memis).
FIRST_NORM=$(printf '%s' "$FIRST" | tr '[:upper:]' '[:lower:]')
LAST_NORM=$(printf '%s' "$LAST" | tr '[:upper:]' '[:lower:]')

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

echo "Target driver (normalized): $FIRST_NORM $LAST_NORM"
echo ""

echo "Matched driver(s):"
psql_exec <<SQL
WITH norm AS (
  SELECT
    id,
    "firstName",
    "lastName",
    "companyId",
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
)
SELECT id, "firstName", "lastName", "companyId"
FROM norm
WHERE first_norm = '$FIRST_NORM'
  AND last_norm = '$LAST_NORM';
SQL

echo ""
echo "Counts to delete:"
psql_exec <<SQL
WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
),
target AS (
  SELECT id FROM norm
  WHERE first_norm = '$FIRST_NORM'
    AND last_norm = '$LAST_NORM'
),
target_loads AS (
  SELECT id FROM loads WHERE "driverId" IN (SELECT id FROM target)
)
SELECT
  (SELECT COUNT(*) FROM target) AS drivers_matched,
  (SELECT COUNT(*) FROM settlements WHERE "driverId" IN (SELECT id FROM target)) AS settlements,
  (SELECT COUNT(*) FROM settlement_lines WHERE "loadId" IN (SELECT id FROM target_loads)) AS settlement_lines,
  (SELECT COUNT(*) FROM documents WHERE "loadId" IN (SELECT id FROM target_loads)) AS load_documents,
  (SELECT COUNT(*) FROM target_loads) AS loads;
SQL

echo ""
echo "Feyzullah Memis loads (should stay untouched):"
psql_exec <<SQL
WITH norm AS (
  SELECT
    id,
    "firstName",
    "lastName",
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
)
SELECT d.id, d."firstName", d."lastName", COUNT(l.id) AS load_count
FROM norm d
LEFT JOIN loads l ON l."driverId" = d.id
WHERE d.first_norm = 'feyzullah'
  AND d.last_norm = 'memis'
GROUP BY d.id, d."firstName", d."lastName";
SQL

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Dry run only. Re-run with CONFIRM=yes to delete."
  exit 0
fi

MATCHED=$(psql_exec -t -A <<SQL
WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
)
SELECT COUNT(*)::text FROM norm
WHERE first_norm = '$FIRST_NORM'
  AND last_norm = '$LAST_NORM';
SQL
)

if [ "$MATCHED" != "1" ]; then
  echo "Abort: expected exactly 1 driver match, got $MATCHED"
  exit 1
fi

echo ""
echo "Deleting..."
psql_exec <<SQL
BEGIN;

WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
),
target AS (
  SELECT id FROM norm
  WHERE first_norm = '$FIRST_NORM'
    AND last_norm = '$LAST_NORM'
),
target_loads AS (
  SELECT id FROM loads WHERE "driverId" IN (SELECT id FROM target)
)
DELETE FROM settlements
WHERE "driverId" IN (SELECT id FROM target);

WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
),
target AS (
  SELECT id FROM norm
  WHERE first_norm = '$FIRST_NORM'
    AND last_norm = '$LAST_NORM'
),
target_loads AS (
  SELECT id FROM loads WHERE "driverId" IN (SELECT id FROM target)
)
DELETE FROM settlement_lines
WHERE "loadId" IN (SELECT id FROM target_loads);

WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
),
target AS (
  SELECT id FROM norm
  WHERE first_norm = '$FIRST_NORM'
    AND last_norm = '$LAST_NORM'
),
target_loads AS (
  SELECT id FROM loads WHERE "driverId" IN (SELECT id FROM target)
)
DELETE FROM documents
WHERE "loadId" IN (SELECT id FROM target_loads);

WITH norm AS (
  SELECT
    id,
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
),
target AS (
  SELECT id FROM norm
  WHERE first_norm = '$FIRST_NORM'
    AND last_norm = '$LAST_NORM'
)
DELETE FROM loads
WHERE "driverId" IN (SELECT id FROM target);

COMMIT;
SQL

echo ""
echo "Done. Remaining loads by driver:"
psql_exec <<SQL
WITH norm AS (
  SELECT
    id,
    "firstName",
    "lastName",
    lower(replace(replace(replace(trim("firstName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS first_norm,
    lower(replace(replace(replace(trim("lastName"), 'ı', 'i'), 'İ', 'i'), 'I', 'i')) AS last_norm
  FROM drivers
)
SELECT d."firstName", d."lastName", COUNT(l.id) AS load_count
FROM norm d
LEFT JOIN loads l ON l."driverId" = d.id
WHERE d.first_norm IN ('anil', 'feyzullah')
   OR d.last_norm IN ('aktan', 'memis')
GROUP BY d.id, d."firstName", d."lastName"
ORDER BY d."lastName", d."firstName";
SQL
