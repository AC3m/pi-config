# Agent Contribution Rules

This is a public repository for personal Pi configuration. Treat it as security-sensitive.

## Safety Rules

- Never commit secrets, credentials, OAuth tokens, API keys, cookies, session files, SSH keys, or private environment values.
- Never commit `~/.pi/agent/auth.json`, `~/.pi/agent/sessions/`, `~/.pi/agent/bin/`, or generated runtime caches.
- Do not vendor third-party extensions, skills, prompt packs, or themes. Document install commands and upstream sources in `README.md` instead.
- Keep machine-specific paths out of tracked config unless clearly documented as optional examples.
- Prefer safe defaults that work on a fresh machine. Put personal overrides in untracked `*.local.json` files.
- Review every extension as executable code. Pi extensions run with full user permissions.
- Any extension that shells out must be small, auditable, and avoid interpolating untrusted input into shell strings.
- Use `execFile`/argument arrays over shell commands when possible.
- Do not add dependencies unless they are necessary and documented.
- Do not run install scripts, tests, commits, pushes, or GitHub/MR actions unless explicitly requested.

## Change Workflow

- Make minimal, focused changes.
- Summarize changed files and proposed verification steps.
- Stop for human review after edits.

## Public Repo Hygiene

Before committing, check:

```bash
git status --short
git diff --check
git diff --stat
```

Also scan for accidental secrets:

```bash
grep -RInE '(api[_-]?key|token|secret|password|sk-[A-Za-z0-9]|ghp_|github_pat_)' . --exclude-dir=.git || true
```
