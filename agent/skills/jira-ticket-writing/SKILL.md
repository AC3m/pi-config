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

## Rules

- Start with the change, not a preamble. One idea per sentence.
- Don't repeat the summary in the description.
- Trim aggressively when rewriting verbose source tickets — preserve intent, cut ceremony.
- Omit implementation detail unless it defines scope.
- No metadata assumptions (assignee, labels, components, priority, fix version) unless explicitly requested or clearly evidenced.
- Check for duplicates before creating. Reference related work when the user points to it.
- If the user is still deciding, show a short inline draft. If they clearly want it created, create directly.
