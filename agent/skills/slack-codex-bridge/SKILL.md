---
name: slack-codex-bridge
description: Reads Slack threads/messages through Codex's Slack MCP/plugin when direct Slack API access is unavailable. Use when the user provides a Slack URL, asks to read/summarize/check a Slack thread, or says Slack CLI/API lacks history scopes but Codex can access Slack.
---

# Slack Codex Bridge

Use Codex as a read-only bridge to Slack when pi has no Slack history scope/tool.

## Quick start

For Slack thread/message reads, run the bundled helper:

```bash
/Users/acempura/.pi/agent/skills/slack-codex-bridge/scripts/read-slack-via-codex.sh \
  "Read Slack thread at <url>. Summarize decisions and quote key messages."
```

The helper runs `codex exec --ephemeral -s read-only --skip-git-repo-check` and captures Codex's final message.

## Workflow

1. Use when user asks to read Slack context and gives a Slack URL/channel/thread.
2. Ask Codex for a narrow, factual output:
   - exact thread/message URL
   - what to extract: decisions, blockers, owners, raw key messages, replies by person
   - include “Do not modify files. Do not post/send Slack messages.”
3. Treat Codex output as Slack-derived context; quote key messages when accuracy matters.
4. If output is too summarized, re-run asking for “raw key messages with timestamps and authors”.
5. If Codex bridge fails, report failure and ask user to paste thread or reconnect Codex Slack.

## Direct command fallback

```bash
tmp=$(mktemp)
codex exec \
  --ephemeral \
  -s read-only \
  --skip-git-repo-check \
  -o "$tmp" \
  "Use Slack tools only. Read Slack thread at <url>. Output concise factual summary plus raw key messages. Do not modify files. Do not post or send Slack messages."
cat "$tmp"
```

## Safety

- Read-only by default. Do not ask Codex to post/send Slack messages unless user explicitly requests it and write support is confirmed.
- Do not expose tokens, config files, or Codex logs containing secrets.
- Prefer quotes for facts that may affect implementation decisions.
- Keep Slack-derived summaries separate from repo/file validation.
