# Pi Config

Personal configuration for [Pi](https://pi.dev). This repo is intended to be public, so it stores only safe, portable config.

## Contents

```text
agent/
├── settings.json
├── extensions/
│   └── notify.ts
├── prompts/
├── skills/
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

Third-party skills/extensions/themes should not be vendored here. Install them from upstream and document the command below.

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

## External skills

These skills are intentionally **not** committed. Install them separately if desired.

```bash
npx skills add vercel-labs/skills@find-skills
npx skills add vercel-labs/agent-skills@vercel-react-best-practices
npx skills add jeffallan/claude-skills@fullstack-guardian
```

To prevent automatic model invocation while keeping manual `/skill:name` usage, add this to each installed skill's `SKILL.md` frontmatter:

```yaml
disable-model-invocation: true
```

Currently used external skill locations on this machine:

```text
~/.agents/skills/find-skills/SKILL.md
~/.agents/skills/fullstack-guardian/SKILL.md
~/.agents/skills/vercel-react-best-practices/SKILL.md
```

## Security

See [`AGENT.md`](./AGENT.md) before making changes.
