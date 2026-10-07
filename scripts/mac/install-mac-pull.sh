#!/bin/sh
# One-time Mac setup: SSH key + 14-day pull into ~/Desktop/yedek
set -eu

KEY="$HOME/.ssh/haulyard_backup"
SUPPORT="$HOME/Library/Application Support/haulyard"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
DEST="$HOME/Desktop/yedek"
VPS="${HAULYARD_VPS_HOST:-root@74.208.181.106}"

mkdir -p "$HOME/.ssh" "$SUPPORT" "$DEST"
chmod 700 "$HOME/.ssh"

if [ ! -f "$KEY" ]; then
  ssh-keygen -t ed25519 -f "$KEY" -N "" -C "haulyard-backup"
  echo "Created SSH key $KEY"
fi

cp "$SCRIPT_DIR/pull-backup.sh" "$SUPPORT/pull-backup.sh"
chmod +x "$SUPPORT/pull-backup.sh" "$SCRIPT_DIR/pull-backup.sh"

PLIST_SRC="$SCRIPT_DIR/com.haulyard.backup-pull.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.haulyard.backup-pull.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cp "$PLIST_SRC" "$PLIST_DST"
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"

echo ""
echo "Mac side is ready. Next, type your VPS password ONCE to install the key:"
echo ""
echo "  ssh-copy-id -i $KEY.pub $VPS"
echo ""
echo "Then pull the first copy:"
echo ""
echo "  sh \"$SUPPORT/pull-backup.sh\""
echo ""
echo "After that, every 14 days it copies into $DEST by itself (Mac must be on)."
