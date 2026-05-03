#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${PI_AGENT_DIR:-$HOME/.pi/agent}"
BACKUP="$TARGET/backups/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$TARGET" "$BACKUP"

link_item() {
  local name="$1"
  local source="$ROOT/agent/$name"
  local dest="$TARGET/$name"

  if [ -e "$dest" ] || [ -L "$dest" ]; then
    mv "$dest" "$BACKUP/$name"
  fi

  ln -s "$source" "$dest"
  echo "Linked $dest -> $source"
}

link_item settings.json
link_item extensions
link_item prompts
link_item themes
link_item skills

echo "Backup directory: $BACKUP"
echo "Reload Pi with /reload or restart pi."
