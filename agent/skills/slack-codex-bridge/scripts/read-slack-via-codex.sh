#!/usr/bin/env bash
set -euo pipefail

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found" >&2
  exit 127
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 '<Slack read request with URL>'" >&2
  exit 2
fi

user_prompt="$*"
out_file=$(mktemp)
log_file=$(mktemp)

prompt="Use Slack tools only. Do not modify files. Do not post or send Slack messages. ${user_prompt}"

if ! codex exec --ephemeral -s read-only --skip-git-repo-check -o "$out_file" "$prompt" >"$log_file" 2>&1; then
  cat "$log_file" >&2
  rm -f "$out_file" "$log_file"
  exit 1
fi

cat "$out_file"
rm -f "$out_file" "$log_file"
