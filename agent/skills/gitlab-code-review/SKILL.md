---
name: gitlab-code-review
description: Finds material code-review issues in GitLab merge requests and posts them as inline DiffNote threads anchored to changed diff lines. Use when the user asks to review a GitLab MR, post inline GitLab review comments, or add code-linked MR feedback.
---

# GitLab Inline Code Review

## Workflow

1. Rename pi session: `/name CR <MR-ID> <GLab-Project-Name>`.
2. Fetch MR metadata once: project id/path, iid, labels, `base_sha`, `start_sha`, `head_sha`.
3. Fetch MR changes/diff. Review every changed file/hunk before posting.
4. Build a candidate ledger. Each finding must reference one file and one anchor line in the MR diff.
5. Post only material, high-confidence issues with `scripts/post_diff_note.sh` so GitLab creates real `DiffNote`s.
6. Verify each note type and exact `position.old_path/old_line/new_path/new_line`.
7. Add `ai-reviewed` label after review completes. Create label first if missing; ask user if creation fails.

## Review depth

Do not stop after first 2-3 findings. Finish full pass first.

For every changed file:
- inspect each hunk plus enough surrounding code/call sites to understand behavior
- check tests, scripts, config, CI, dependencies, and lockfiles for integration gaps
- skip generated files unless they reveal dependency/version mismatch or shipped behavior
- keep scanning after finding issues; dedupe by root cause before posting

If fewer than 4 candidate findings exist, run a focused second pass for broken CI/scripts, flaky or false-positive tests, async waits/races, API/typing/config mismatches, error/null/edge cases, security, data loss, and prod regression risk.

Post all material issues found. Do not invent comments to reach a count.

## Candidate ledger

```text
path:line
issue:
impact:
confidence: high|medium|low
post: yes|no
reason:
```

Post only `post: yes` findings. Prefer no comment over speculative or style-only feedback.

## Finding quality

Post when impact is concrete: correctness bug, broken CI/build/test, false-positive or flaky test, security/privacy risk, data loss, prod regression, API contract mismatch, missing error handling that hides failures, or naming that is ambiguous, misleading, domain-inaccurate, or against established software-engineering/project standards.

Skip: formatting, cosmetic naming preference, broad refactors, low-confidence guesses, and duplicate symptoms of one root cause.

## Comment style

- Lead with issue, not severity or praise.
- Use direct plain English. No filler or hedging (`maybe`, `consider`, `seems`, `potentially`).
- State breakage, impact, and fix in 1-2 short sentences.
- Wrap code refs in backticks (`handleAllLocale`, `src/server.ts`, `SK1`).
- Use suggestion blocks only when small and obvious.
- End every comment with a blank line, then `_[ai-reviewed]_`.

Example:

````text
`handleAllLocale` hides write failures, so partial locale updates can look successful. Log locale + error, then rethrow so the consumer fails the message.

```suggestion:-0+1
throw error;
```

_[ai-reviewed]_
````

## Posting

Prefer body files to preserve Markdown, semicolons, and suggestion blocks:

```bash
~/.pi/agent/skills/gitlab-code-review/scripts/post_diff_note.sh \
  --project <id> --mr <iid> \
  --base <sha> --start <sha> --head <sha> \
  --path <file> [--old-path <file>] \
  [--line <new_line>] [--old-line <old_line>] \
  --body-file /tmp/comment.md
```

- `--line` for added/changed lines; `--old-line` for removed lines.
- Renamed/context lines: inspect hunk mapping; pass both sides with `--old-path <old> --old-line <old_line> --path <new> --line <new_line>`.
- Verify response with: `jq '.notes[] | {id,type,position}'`.
- If API returns `500`, check discussions before reposting; note may have been created.
- Token resolves from `GITLAB_TOKEN`, `GITLAB_ACCESS_TOKEN`, `OAUTH_TOKEN`, or `glab auth status --show-token`.
- If note anchors are wrong or a generic `DiscussionNote` was created, ask user before deleting/reposting.

## Quality checks / eval ideas

See [EVALS.md](EVALS.md) for lightweight evals covering review recall, no-comment precision, and posting contract.
