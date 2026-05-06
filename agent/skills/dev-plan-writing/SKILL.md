---
name: dev-plan-writing
description: Drafts and posts concise Jira Dev Plan comments for engineering tickets using Jira context, repo exploration, and team conventions. Use when creating estimation-focused dev plans, Jira implementation-plan comments, or ADF Dev Plan comments.
---

# Dev Plan Writing

Create concise Jira "Dev Plan" comments for estimation and teammate handoff.

## Quick start

1. Read ticket with `acli`.
2. Inspect relevant repo patterns.
3. Draft `Dev Plan` + numbered steps only.
4. Ask user to confirm.
5. Post ADF comment only after confirmation.

## Workflow

1. Fetch Jira context with `acli`: summary, description, comments, parent/epic, and attachments if useful.
2. Convert Jira ADF to readable text when needed.
3. Explore repo(s) enough to identify owning area, existing patterns, data flow, integration points, and likely tests.
4. Use HITL when ambiguity could leak inaccurate info or imply an unconfirmed decision.
5. Draft first; do not post until user confirms.
6. When posting, use ADF with `Dev Plan` heading and ordered list.
7. Verify `acli` success output after posting.

## HITL Triggers

Ask a focused question, with recommendation when possible, if:

1. Correct repo or branch is unclear.
2. API contract or data shape is unconfirmed.
3. Product/design copy or assets are missing.
4. Package/component source is unclear.
5. Scope boundaries are unclear.
6. Implementation path has meaningful trade-offs.
7. Draft would state an assumption as fact.

## Dev Plan Output Format

Use this exact shape:

```markdown
Dev Plan

1. <high-level step>
2. <high-level step>
3. <high-level step>
```

No sections, bullets, notes, risks, or dependencies unless user explicitly asks.

## Style Rules

1. Keep lean: scope for estimation, not detailed implementation instructions.
2. Avoid over-specifying implementation details.
3. Include implementation details only when confirmed by repo patterns, obvious/no-brainer, or needed for estimation/scope clarity.
4. If a dev decision is needed, keep step general or ask for decision with recommendation.
5. Do not leak assumptions as facts; mark uncertainty in draft or ask before posting.
5. Name concrete repos/files/patterns only when helpful.
6. Use numbered lists only in the plan.
7. Avoid over-specifying internals unless risk/estimation depends on it.
8. Mention out-of-scope only when ticket states it or it prevents scope creep.

## Posting

Create ADF JSON and validate it before posting:

```bash
python3 -m json.tool /tmp/comment.adf.json >/dev/null
acli jira workitem comment create --key DISCOIO-1234 --body-file /tmp/comment.adf.json --json
```

ADF structure:

1. Heading level 2: `Dev Plan`
2. Ordered list: all plan steps

## Review Checklist

1. Uses confirmed ticket context.
2. Does not present assumptions as facts.
3. Uses `Dev Plan` heading.
4. Uses numbered steps only.
5. Includes implementation details only when justified.
6. User confirmed before posting.
