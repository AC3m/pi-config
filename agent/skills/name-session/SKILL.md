---
name: name-session
description: Set or update the pi session display name based on what the conversation is actually about. Use when the user says "name this", "rename this session", "name this convo", or invokes /skill:name-session.
---

# Name Session

Pick a short name that describes the work in this session, then set it with the `set_session_name` tool.

## Format

Match commit-message style: `type(SCOPE): summary`.

- `type` — conventional commit verb: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`.
- `SCOPE` — a JIRA ID if present (e.g. `PROJECT-1234`); otherwise the area, repo, file, or feature being changed.
- `summary` — lowercase, imperative, no trailing punctuation.
- Keep the whole name under ~60 characters.
- Use the same terminology already in the conversation.

## Identifiers

Only include identifiers that actually appear in the session. Do not guess.

- **JIRA ID** (e.g. `PROJECT-1234`) — use as the scope: `feat(PROJECT-1234): …`.
- **MR / PR ID** (e.g. `!482`, `#127`) — append in parentheses: `… (!482)`.
- **Repo / area** — use as scope when there is no JIRA ID: `chore(pi-config): …`.

## Steps

1. Skim the session for: stated goal, files touched, JIRA/MR/PR IDs, repo name.
2. Draft one name following the format above.
3. Call the `set_session_name` tool with the drafted name.
4. If the tool is unavailable, tell the user to type `/name <drafted name>` manually.
5. If the user pushes back, adjust and call `set_session_name` again.

## Examples

- `chore(jira-ticket-writing): switch tooling to acli`
- `feat(PROJECT-1234): refactor sb-epic-value-carousel`
- `feat(pi-config): add session-naming skill`
- `fix(discoio-web): carousel hydration (!482)`
