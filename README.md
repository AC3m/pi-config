# Pi Config

Personal configuration for [Pi](https://pi.dev). This repo is intended to be public, so it stores only safe, portable config.

## Contents

```text
agent/
├── AGENTS.md
├── settings.json
├── extensions/
│   ├── context-breakdown.ts
│   ├── custom-footer.ts
│   ├── filter-copilot-openai-models.ts
│   └── notify.ts
├── prompts/
├── skills/
│   ├── caveman/
│   ├── commit-message-format/
│   ├── gitlab-code-review/
│   └── jira-ticket-writing/
└── themes/
```

## What is not committed

Do not commit Pi runtime state or secrets:

```text
~/.pi/agent/auth.json
~/.pi/agent/sessions/
~/.pi/agent/bin/
~/.pi/agent/tools/
```

Third-party skills/extensions/themes should not be vendored here. Install them from upstream and document the command below. Personal skills in `agent/skills/` are committed because they are plain-text workflow instructions and contain no credentials.

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

### `context-breakdown.ts`

Adds a command that shows approximate token usage by file for files read in the current session.

### `notify.ts`

Sends a notification when Pi finishes a turn and is ready for input.

Behavior:

- In Warp: emits Warp structured `warp://cli-agent` notification via OSC 777.
- Outside Warp on macOS: uses `terminal-notifier`.

Install the macOS fallback dependency:

```bash
brew install terminal-notifier
```

### `filter-copilot-openai-models.ts`

Removes OpenAI/GPT models from the GitHub Copilot provider list so Codex remains the single place to select those models.

This is useful only when both `github-copilot` and `openai-codex` are configured in Pi. If Codex is not configured, this extension hides Copilot's GPT models without providing an OpenAI/Codex alternative.

### `custom-footer.ts`

Replaces Pi's default footer with a compact one-line usage summary:

```text
154k(12.3%)/272k (auto) ↑154k ↓1.9k R259k $0.955 (sub) caveman:on
```

`caveman:on/off` updates from user input phrases (`caveman`, `be terse`, `normal mode`, `stop caveman`, `disable caveman`, `caveman off`, etc.).

## Skill dependencies

Some personal skills shell out to external CLIs. Install these on the host as needed:

- `jira-ticket-writing` — requires the [Atlassian CLI (`acli`)](https://developer.atlassian.com/cloud/acli/) for all Jira reads and writes. Verify with `acli auth status`.

```bash
brew install atlassian/acli/acli
acli auth login
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
