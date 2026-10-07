#!/bin/sh
# Copy the latest VPS snapshot onto this Mac.
# Destination: ~/Desktop/yedek
# Keeps the last 6 Mac copies (~3 months if pulled every 14 days).
set -eu

VPS_HOST="${HAULYARD_VPS_HOST:-root@74.208.181.106}"
REMOTE_FILE="${HAULYARD_REMOTE_BACKUP:-/root/backups/haulyard-latest.tar.gz}"
DEST="${HAULYARD_MAC_BACKUP_DIR:-$HOME/Desktop/yedek}"
KEY="${HAULYARD_SSH_KEY:-$HOME/.ssh/haulyard_backup}"
KEEP_ON_MAC=6
STAMP=$(date +%Y%m%d)
LOCAL="$DEST/haulyard-$STAMP.tar.gz"

mkdir -p "$DEST"

SSH_OPTS="-o BatchMode=yes -o ConnectTimeout=20"
if [ -f "$KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $KEY"
fi

# scp follows the VPS symlink to the newest nightly snapshot
# shellcheck disable=SC2086
scp $SSH_OPTS "$VPS_HOST:$REMOTE_FILE" "$LOCAL"

# Keep only the newest N dated files on the Mac
# shellcheck disable=SC2012
ls -1t "$DEST"/haulyard-*.tar.gz 2>/dev/null | tail -n +$((KEEP_ON_MAC + 1)) | while read -r old; do
  rm -f "$old"
done

echo "Saved $LOCAL ($(du -h "$LOCAL" | awk '{print $1}'))"
