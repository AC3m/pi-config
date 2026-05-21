---
name: name-session
description: Set or update the pi session display name based on what the conversation is actually about. Use concise essence-first names by default; use commit-message style only when invoked by a push hook. Use when the user says "name this", "rename this session", "name this convo", or invokes /skill:name-session.
---

# Name Session

Pick a short name that captures the essence of this session, then set it with the `set_session_name` tool.

## Format

Default: concise human title, not commit-message style.

- Capture main outcome/workstream in 3-7 words.
- Include a Jira/MR/PR ID only when central to the session.
- Prefer natural wording over `type(scope): summary`.
- Keep the whole name under ~60 characters.
- Use the same terminology already in the conversation.

Push hook only: use commit-message style `type(SCOPE): summary`.

- Treat as push hook only when invocation/context explicitly says push hook, pre-push, post-push, or git hook.
- `type` — conventional commit verb: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`.
- `SCOPE` — JIRA ID if present; otherwise repo/area/file.
- `summary` — lowercase, imperative, no trailing punctuation.

## Identifiers

Only include identifiers that actually appear in the session. Do not guess.

- **JIRA ID** (e.g. `PROJECT-1234`) — include when it is central: `PROJECT-1234 durable fixture cache`.
- **MR / PR ID** (e.g. `!482`, `#127`) — include when central: `carousel hydration review !482`.
- **Repo / area** — use when it best describes the session: `create-jira-item skill cleanup`.

## Steps

1. Skim the session for: stated goal, outcome, files touched, JIRA/MR/PR IDs, repo name.
2. Decide mode: default concise title unless explicit push-hook context.
3. Draft one name following the selected format.
4. Call the `set_session_name` tool with the drafted name.
5. If the tool is unavailable, tell the user to type `/name <drafted name>` manually.
6. If the user pushes back, adjust and call `set_session_name` again.

## Examples

Default:
- `DISCOIO-3612 durable fixture cache`
- `create-jira-item skill cleanup`
- `carousel hydration review !482`

Push hook:
- `chore(create-jira-item): switch tooling to acli`
- `feat(PROJECT-1234): refactor sb-epic-value-carousel`
- `fix(discoio-web): carousel hydration (!482)`
