---
name: jira-ticket-writing
description: Draft, rewrite, or create Jira tickets (stories, tasks, bugs). Use when the user wants to create a ticket, tighten acceptance criteria, or prepare Jira-ready content.
---

# Jira Ticket Writing

Write tickets that are short, scannable, and precise. Lead with the change, not the narrative.

## Tone

- Direct, technical, executive. Prefer verbs like `migrate`, `remove`, `align`, `support`, `enable`.
- No filler, no promotional framing, no padded rationale.
- Reuse terminology from referenced issues, MRs, or repo context.

## Structures

Pick the lightest that fits:

**Task** — summary + 1 short description paragraph.

**Story** — summary + short user story (`As a … I want … so that …`) + 3–5 outcome-based acceptance criteria bullets.

**Bug** — summary + problem statement + impact + expected fix outcome.

Summary format: `[Area] Short action-oriented title`

## Tooling

Use the Atlassian CLI (`acli`) for all Jira reads and writes. Pass `--json` when parsing output.

- **Search / dedupe:** `acli jira workitem search --jql "<JQL>" --json`
- **View:** `acli jira workitem view <KEY> --json` (add `--fields` to scope)
- **Create:** `acli jira workitem create --project <KEY> --type <Task|Story|Bug|Epic> --summary "…" --description-file <path>`
  - For multi-line or ADF descriptions, write to a temp file and pass `--description-file`.
  - Use `--generate-json` + `--from-json` when fields exceed flag coverage (parent, custom fields, links).
- **Edit:** `acli jira workitem edit --key <KEY> --summary "…" --description-file <path>` (`--yes` to skip confirmation)
- **Comment:** `acli jira workitem comment create --key <KEY> --body-file <path>`
- **Transition:** `acli jira workitem transition --key <KEY> --status "<Status>"`
- **Link:** `acli jira workitem link create …` (see `--help` for relation flags)

If `acli` is not installed or not authenticated (`acli auth status`), stop and tell the user — do not silently fall back.

## Rules

- Start with the change, not a preamble. One idea per sentence.
- Don't repeat the summary in the description.
- Trim aggressively when rewriting verbose source tickets — preserve intent, cut ceremony.
- Omit implementation detail unless it defines scope.
- No metadata assumptions (assignee, labels, components, priority, fix version) unless explicitly requested or clearly evidenced.
- Check for duplicates before creating via `acli jira workitem search`. Reference related work when the user points to it.
- If the user is still deciding, show a short inline draft. If they clearly want it created, create directly.
