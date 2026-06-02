# Pi Config

Personal configuration for [Pi](https://pi.dev). This repo is intended to be public, so it stores only safe, portable config.

## Contents

```text
.
├── AGENT.md
├── install.sh
└── agent/
    ├── AGENTS.md
    ├── extensions/
    │   ├── auto-name-session.ts
    │   ├── caveman-mode/
    │   ├── context.ts
    │   ├── custom-footer.ts
    │   ├── figma-assets/
    │   ├── hard-guard.ts
    │   ├── hard-guard/
    │   ├── notify.ts
    │   ├── sb-ai-update/
    │   ├── session-status/
    │   ├── snippet-copy/
    │   └── warp-cli-agent/
    └── skills/
        ├── copy-message-drafting/
        ├── name-session/
        ├── okr/
        └── slack-codex-bridge/
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

The script symlinks Pi config paths into `~/.pi/agent` and moves existing files/directories to a timestamped backup under `~/.pi/agent/backups/`. `agent/settings.json` is local-only and ignored by git.

Reload Pi:

```text
/reload
```

or restart `pi`.

## Extensions

### `auto-name-session.ts`

Registers the `set_session_name` tool and schedules `/skill:name-session` when a session is still unnamed.

Triggers:

- after an agent-run `git push`
- every 10 user messages

### `caveman-mode/`

Owns deterministic caveman activation.

- `agent/extensions/caveman-mode/config.json` enables caveman and sets `lite`, `full`, or `ultra`.
- `PI_CAVEMAN=off` disables caveman for a process.
- `PI_CAVEMAN_LEVEL=lite|full|ultra` overrides the configured level.
- Caveman instructions are injected via `before_agent_start`; `AGENTS.md` does not enable caveman.
- Current caveman state is emitted on `caveman-mode:status` for UI extensions.

### `context.ts`

Adds `/context`, a token-usage grid for the current session. It breaks down system, user, assistant, thinking, tool, compaction, image, and free-space usage.

### `session-status/`

Owns the session metadata widget above the input editor. Displays:

```text
caveman:ultra • sb-ai:v1.2.3 • loaded skills: caveman, clean-code-ts
```

- `caveman:<level>` shows `lite`, `full`, or `ultra` from `caveman-mode`.
- `caveman:off` shows when `caveman-mode` is disabled, missing, or has no valid level.
- `sb-ai:<version>` appears when `sb-ai` can be found through `PI_SB_AI_PATH`, `SB_AI_PATH`, or the Pi package install directory.
- `loaded skills` is inferred from skill blocks, loaded `SKILL.md` reads, and extension-injected caveman context.

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

### `hard-guard.ts`

Adds an approval gate for risky shell commands and user bash commands. Warp receives permission request/reply events when available.

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

### `sb-ai-update/`

Keeps the `sb-ai` Pi package fresh.

- Auto-checks for newer package tags on session start.
- `/sb-ai-update` updates `sb-ai` and reloads Pi resources.
- `/sb-ai-reload` reloads Pi resources after an update.
- `/sb-ai-version` shows the installed `sb-ai` version.

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
