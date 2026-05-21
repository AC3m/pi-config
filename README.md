# Pi Config

Personal configuration for [Pi](https://pi.dev). This repo is intended to be public, so it stores only safe, portable config.

## Contents

```text
agent/
├── AGENTS.md
├── extensions/
│   ├── auto-name-session.ts
│   ├── context.ts
│   ├── custom-footer.ts
│   ├── figma-assets/
│   ├── filter-copilot-openai-models.ts
│   ├── hard-guard.ts
│   ├── session-status/
│   ├── notify.ts
│   ├── snippet-copy/
│   └── warp-cli-agent/
└── skills/
    ├── commit-message-format/
    ├── copy-message-drafting/
    ├── create-jira-item/
    ├── gitlab-code-review/
    ├── name-session/
    ├── slack-codex-bridge/
    └── write-a-skill/
```

## What is not committed

Do not commit Pi runtime state or secrets:

```text
~/.pi/agent/auth.json
~/.pi/agent/sessions/
~/.pi/agent/bin/
~/.pi/agent/tools/
```

Local-only overrides and external skill symlinks are ignored in `.gitignore`, including:

```text
agent/settings.json
agent/extensions/sb-ai-version.ts
agent/skills/diagnose
agent/skills/grill-me
agent/skills/grill-with-docs
agent/skills/improve-codebase-architecture
agent/skills/prototype
agent/skills/skill-creator
agent/skills/tdd
agent/skills/to-issues
agent/skills/to-prd
agent/skills/triage
agent/skills/typescript-advanced-types
agent/skills/vercel-composition-patterns
agent/skills/vercel-react-view-transitions
agent/skills/zoom-out
```

Third-party skills/extensions/themes should not be vendored here. Install them from upstream and document install commands instead.

## Install

Clone this repo, then run:

```bash
./install.sh
```

The script symlinks tracked config into `~/.pi/agent` and moves existing files/directories to a timestamped backup under `~/.pi/agent/backups/`.

Reload Pi:

```text
/reload
```

or restart `pi`.

## Extensions

### `session-status/`

Owns the session metadata widget above the input editor. Displays:

```text
caveman:full • sb-ai:v1.2.3 • loaded skills: caveman, clean-code-ts
```

- `caveman:<level>` shows `lite`, `full`, or `ultra` when enabled.
- `caveman:off` stays off when disabled.
- `sb-ai:<version>` appears when `sb-ai` can be found through `PI_SB_AI_PATH`, `SB_AI_PATH`, or the Pi package install directory.
- `loaded skills` is inferred from skill blocks and loaded `SKILL.md` reads in current context.

### `snippet-copy/`

Extracts copyable code blocks and tagged assistant messages. It only handles copy behavior; it does not render persistent UI.

Commands and shortcuts:

- `/copy-code` or `ctrl+shift+c` — pick and copy a code snippet without terminal wrapping.
- `/copy-msg` or `ctrl+shift+m` — pick and copy a full assistant message as rich Slack-friendly text.

### `custom-footer.ts`

Replaces Pi's default footer with a compact usage/model summary and current repository location:

```text
154k(12.3%)/272k (auto) ↑154k ↓1.9k R259k $0.955 (sub)            gpt-5.5 • xhigh
```

Also adds current-branch GitLab MR link discovery and `/open-mr`.

### `warp-cli-agent/`

Emits Warp's structured `warp://cli-agent` OSC 777 events for Pi turns:

- `session_start` + `prompt_submit` when Pi starts work
- `stop` when Pi finishes
- `permission_request` / `permission_replied` from `hard-guard.ts`

Completion notification titles use the Pi session name when set, otherwise a shortened user prompt. Bodies use short fixed copy: `Pi finished. Open the tab to review.` Warp controls badge visibility and does not expose runtime tab color/size controls.

### `notify.ts`

Sends the same completion copy via macOS `terminal-notifier` when Pi finishes outside Warp.

Install the fallback dependency:

```bash
brew install terminal-notifier
```

### `filter-copilot-openai-models.ts`

Removes OpenAI/GPT models from the GitHub Copilot provider list so Codex remains the single place to select those models.

This is useful only when both `github-copilot` and `openai-codex` are configured in Pi. If Codex is not configured, this extension hides Copilot's GPT models without providing an OpenAI/Codex alternative.

### `figma-assets/`

Adds tools for listing Figma nodes and exporting assets from Figma file URLs or node IDs.

## CLI dependencies

Some personal skills/extensions shell out to external CLIs. Install these on the host as needed:

```bash
brew install atlassian/acli/acli
acli auth login
brew install glab
```

## External skills

Third-party skills are intentionally **not** committed. Install them separately if desired.

```bash
npx skills add vercel-labs/skills@find-skills
npx skills add vercel-labs/agent-skills@vercel-react-best-practices
npx skills add jeffallan/claude-skills@fullstack-guardian
```

To prevent automatic model invocation while keeping manual `/skill:name` usage, add this to each installed skill's `SKILL.md` frontmatter:

```yaml
disable-model-invocation: true
```

## Security

See [`AGENT.md`](./AGENT.md) before making changes.
