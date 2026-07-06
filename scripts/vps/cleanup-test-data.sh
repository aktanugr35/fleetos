#!/bin/sh
# Remove test settlements plus all fuel and toll transactions.
# Keeps drivers, loads, trucks, fuel cards, and toll devices.
#
# Usage (on VPS from repo root):
#   sh scripts/vps/cleanup-test-data.sh              # dry-run preview
#   CONFIRM=yes sh scripts/vps/cleanup-test-data.sh  # execute deletes
#
# Optional company filter (passed to each step):
#   sh scripts/vps/cleanup-test-data.sh --company-id <uuid>

set -e
cd "$(dirname "$0")/../.."

ARGS="$@"
export CONFIRM

echo "========================================"
echo "Test data cleanup (settlements + fuel + toll)"
echo "========================================"
echo ""

echo ">>> Step 1/3: Settlements"
sh scripts/vps/cleanup-settlements.sh $ARGS
echo ""

if [ "$CONFIRM" != "yes" ]; then
  echo ">>> Step 2/3: Fuel transactions (preview)"
  sh scripts/vps/cleanup-fuel-transactions.sh $ARGS
  echo ""
  echo ">>> Step 3/3: Toll transactions (preview)"
  sh scripts/vps/cleanup-toll-transactions.sh $ARGS
  echo ""
  echo "Dry run complete. Re-run with CONFIRM=yes to delete everything above."
  exit 0
fi

echo ">>> Step 2/3: Fuel transactions"
sh scripts/vps/cleanup-fuel-transactions.sh $ARGS
echo ""

echo ">>> Step 3/3: Toll transactions"
sh scripts/vps/cleanup-toll-transactions.sh $ARGS
echo ""

echo "All test settlements, fuel, and toll data removed."
