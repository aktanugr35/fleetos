#!/bin/sh
# Reset a driver's DOT intake: delete the generated application PDF and all
# uploaded ID document rows (license front/back, medical card, passport, work
# authorization), invalidate old links, and print a fresh application link.
#
# Usage (on VPS from repo root):
#   sh scripts/vps/reset-driver-intake.sh --name "Ugur Aktan"                 # dry-run preview
#   CONFIRM=yes sh scripts/vps/reset-driver-intake.sh --name "Ugur Aktan"     # execute + new link
#   CONFIRM=yes sh scripts/vps/reset-driver-intake.sh --driver-id <uuid>
#
# Notes:
#   - Document DB rows are removed so they disappear from the driver profile.
#     Files stored in S3/R2 are not deleted here (harmless orphans); local
#     upload files are removed when present.
#   - Dry-run by default. Set CONFIRM=yes to actually delete + generate a link.

set -e

DRIVER_ID=""
DRIVER_NAME="Ugur Aktan"
DB_CONTAINER="${DB_CONTAINER:-haulyard-prod-db}"
API_CONTAINER="${API_CONTAINER:-haulyard-prod-api}"
DB_USER="${POSTGRES_USER:-haulyard}"
DB_NAME="${POSTGRES_DB:-haulyard}"

while [ $# -gt 0 ]; do
  case "$1" in
    --driver-id) DRIVER_ID="$2"; shift 2 ;;
    --name) DRIVER_NAME="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

INTAKE_TYPES="'DRIVER_APPLICATION','DRIVER_LICENSE_FRONT','DRIVER_LICENSE_BACK','MEDICAL_CARD','PASSPORT','WORK_AUTHORIZATION'"

# ── Resolve driver id ───────────────────────────────────
if [ -z "$DRIVER_ID" ]; then
  MATCHES=$(psql_exec -t -A -c "SELECT id FROM drivers WHERE trim(\"firstName\" || ' ' || \"lastName\") ILIKE trim('$DRIVER_NAME');")
  COUNT=$(printf '%s\n' "$MATCHES" | sed '/^$/d' | wc -l | tr -d ' ')
  if [ "$COUNT" -eq 0 ]; then
    echo "No driver found matching '$DRIVER_NAME'. Pass --driver-id <uuid>."
    echo ""
    echo "Similar names:"
    psql_exec -c "SELECT id, \"firstName\", \"lastName\" FROM drivers WHERE \"firstName\" ILIKE '%${DRIVER_NAME%% *}%' OR \"lastName\" ILIKE '%${DRIVER_NAME##* }%';"
    exit 1
  fi
  if [ "$COUNT" -gt 1 ]; then
    echo "Multiple drivers named '$DRIVER_NAME'. Re-run with --driver-id <uuid>:"
    printf '%s\n' "$MATCHES"
    exit 1
  fi
  DRIVER_ID="$MATCHES"
fi

echo "========================================"
echo "Driver intake reset"
echo "Driver: $DRIVER_NAME  ($DRIVER_ID)"
echo "========================================"
echo ""

echo "Intake documents currently on file:"
psql_exec <<SQL
SELECT type, title, "createdAt"
FROM documents
WHERE "driverId" = '$DRIVER_ID' AND type IN ($INTAKE_TYPES)
ORDER BY "createdAt" DESC;
SQL

echo ""
echo "Intake links on file:"
psql_exec <<SQL
SELECT token, "formSubmittedAt", "usedAt", "expiresAt"
FROM driver_intake_tokens
WHERE "driverId" = '$DRIVER_ID'
ORDER BY "createdAt" DESC;
SQL

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "Dry run only. Re-run with CONFIRM=yes to delete the above and generate a fresh link."
  exit 0
fi

# ── Collect local file paths (best effort) before deleting rows ──
FILE_URLS=$(psql_exec -t -A -c "SELECT \"fileUrl\" FROM documents WHERE \"driverId\" = '$DRIVER_ID' AND type IN ($INTAKE_TYPES);")

echo ""
echo "Deleting intake document rows..."
psql_exec <<SQL
BEGIN;
DELETE FROM documents WHERE "driverId" = '$DRIVER_ID' AND type IN ($INTAKE_TYPES);
UPDATE driver_intake_tokens SET "usedAt" = now()
  WHERE "driverId" = '$DRIVER_ID' AND "usedAt" IS NULL;
COMMIT;
SQL

# ── Remove local upload files when present (S3/R2 objects are left as-is) ──
if docker ps --format '{{.Names}}' | grep -qx "$API_CONTAINER"; then
  for u in $FILE_URLS; do
    case "$u" in
      /uploads/*)
        docker exec "$API_CONTAINER" sh -c "rm -f /app/apps/api${u} 2>/dev/null || true" ;;
    esac
  done
  echo "Local file cleanup done (if any)."
fi

# ── Generate a fresh intake link ────────────────────────
echo ""
echo "Generating a new application link..."
NEW_TOKEN=$(psql_exec -t -A <<SQL
INSERT INTO driver_intake_tokens (id, "companyId", "driverId", token, "createdById", "expiresAt", "createdAt")
SELECT gen_random_uuid(),
       d."companyId",
       d.id,
       replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
       (SELECT u.id FROM users u
        WHERE u."companyId" = d."companyId" AND u.role IN ('COMPANY_ADMIN','SUPER_ADMIN')
        ORDER BY u."createdAt" LIMIT 1),
       now() + interval '30 days',
       now()
FROM drivers d
WHERE d.id = '$DRIVER_ID'
RETURNING token;
SQL
)

FRONTEND_URL=$(docker exec "$API_CONTAINER" printenv FRONTEND_URL 2>/dev/null | tr -d '\r')
FRONTEND_URL="${FRONTEND_URL%/}"

echo ""
echo "Done. Intake reset for $DRIVER_NAME."
echo ""
echo "Remaining intake documents:"
psql_exec -c "SELECT COUNT(*) AS remaining FROM documents WHERE \"driverId\" = '$DRIVER_ID' AND type IN ($INTAKE_TYPES);"
echo ""
echo "New application link:"
echo "  ${FRONTEND_URL}/driver-application/${NEW_TOKEN}"
echo ""
echo "The driver's profile now shows no application PDF or ID photos until the form is completed again."
