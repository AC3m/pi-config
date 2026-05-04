---
name: commit-message-format
description: "Use when writing git commit messages or merge request titles. Format: type(JIRA-ID): short summary. Example: feat(PROJ-1234): add navigation carousel."
---

# Commit Message Format

Format: `<type>(<JIRA-ID>): <short summary>`

## Types

- `feat` — feature work
- `fix` — bug fix
- `refactor` — restructuring without behaviour change
- `test` — test-only change
- `docs` — docs-only change
- `chore` — maintenance or tooling

## Rules

- Extract the Jira ID from user message, branch name, or issue context.
- If no Jira ID is available, ask: `What Jira key should I use for the commit and MR title?` — wait for the answer.
- Summary: lowercase, no trailing period, concise.
- Apply to both git commit messages and merge request titles.
