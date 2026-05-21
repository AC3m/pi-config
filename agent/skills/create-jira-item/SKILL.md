---
name: create-jira-item
description: Draft, rewrite, or create concise Jira work items with user-story-first structure and correct Jira formatting. Use when the user wants to create a Jira item/ticket/story/task/bug, tighten acceptance criteria, prepare Jira-ready content, or publish to Jira.
---

# Create Jira Item

Write Jira items that are short, scannable, and precise. Lead with the change, not the narrative.

## Tone

- Direct, technical, executive. Prefer verbs like `migrate`, `remove`, `align`, `support`, `enable`.
- No filler, no promotional framing, no padded rationale.
- Reuse terminology from referenced issues, MRs, or repo context.

## Defaults

- Default issue type is **User Story** unless the user explicitly asks for another type.
- Always include a **User Story** section.
- If persona is not provided, infer it from context. If unsafe, ask.
- Use **Acceptance Criteria** heading, never **AC**.
- Number criteria.
- Include only criteria needed to verify scope.

## Structures

Summary format: `[Area] Short action-oriented title`

**Default User Story**: Summary; User Story (`As a … I want … so that …`); Description (1 short paragraph); relevant required values/list; numbered Acceptance Criteria.

**Bug**: Summary; User Story; Problem statement; Impact; Expected fix outcome; numbered Acceptance Criteria.

**Task/Other type**: Summary; User Story; Description (1 short paragraph); numbered Acceptance Criteria.

## Repo Context Discipline

Repo context is input, not ticket content.

Use repo exploration to confirm scope, names, affected systems, and risks. Do not include file paths, route examples, implementation notes, or “repo context shows…” unless the user asks or it defines ticket scope.

Default ticket content should include only:
- requested change
- affected area
- required values/config
- acceptance criteria

## Tooling

Use the Atlassian CLI (`acli`) for all Jira reads and writes. Pass `--json` when parsing output.

- **Search / dedupe:** `acli jira workitem search --jql "<JQL>" --json`
- **View:** `acli jira workitem view <KEY> --json` (add `--fields` to scope)
- **Create:** `acli jira workitem create --project <KEY> --type "User Story" --summary "…" --description-file <path>`
  - Use the user-requested issue type instead of `"User Story"` only when explicitly requested.
  - For formatted descriptions, write Atlassian Document Format (ADF) JSON and pass it to `--description-file`.
  - Do not expect Markdown files to render as Jira rich text. Markdown may be stored as plain text.
  - Use `--generate-json` + `--from-json` when fields exceed flag coverage (parent, custom fields, links).
- **Edit:** `acli jira workitem edit --key <KEY> --summary "…" --description-file <path>` (`--yes` to skip confirmation)
- **Comment:** `acli jira workitem comment create --key <KEY> --body-file <path>`
- **Transition:** `acli jira workitem transition --key <KEY> --status "<Status>"`
- **Link:** `acli jira workitem link create …` (see `--help` for relation flags)

If `acli` is not installed or not authenticated (`acli auth status`), stop and tell the user. Do not silently fall back.

## Jira Formatting

Use ADF JSON when rich formatting matters: headings, bullets, numbered lists, code marks, links, tables.

After creating/editing formatted tickets, verify formatting with:

`acli jira workitem view <KEY> --fields description --json`

If description is one paragraph containing Markdown markers like `**`, `-`, or backticks, replace it with ADF.

## Rules

- Start with the change, not a preamble. One idea per sentence.
- Do not repeat the summary in the description.
- Trim aggressively when rewriting verbose source tickets. Preserve intent, cut ceremony.
- Omit implementation detail unless it defines scope.
- No metadata assumptions: assignee, labels, components, priority, fix version.
- Check for duplicates before creating via `acli jira workitem search`.
- If the user is still deciding, show a short inline draft.
- If the user says publish/create after iterative edits, create from the final approved draft exactly. Do not re-expand from earlier context.
