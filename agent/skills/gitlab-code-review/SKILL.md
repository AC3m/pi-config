---
name: gitlab-code-review
description: Post review findings as inline DiffNote threads on GitLab merge request diffs. Use when the user wants code-linked review comments on specific files and lines, not generic MR discussions.
---

# GitLab Inline Review Comments

## Workflow

1. Collect review findings — each must reference one file and one anchor line in the MR diff.
2. Fetch MR diff refs: `base_sha`, `start_sha`, `head_sha`, target path, and target line.
3. Post with the bundled script (produces real `DiffNote`, not `DiscussionNote`).
4. One issue per thread, anchored to the most relevant changed line.
5. After posting, verify the response shows type `DiffNote`.
6. Add the `ai-reviewed` label to the MR (create the label first if it doesn't exist; ask the user if creation fails).

## Comment Style

- Lead with the issue, not a severity label.
- Be specific: state the break/risk and suggest a fix direction when obvious.
- Wrap code references in backticks (`handleAllLocale`, `src/server.ts`, `SK1`).
- Keep it short: one issue, plain language, concrete impact, one recommendation.
- End every comment with a blank line then `_[ai-reviewed]_`.

Example:

```text
`handleAllLocale` swallows the real exception here, so partial locale writes silently succeed. Log operation + locale + error and rethrow so the consumer can fail the message.

_[ai-reviewed]_
```

## Posting

```bash
~/.pi/agent/skills/gitlab-code-review/scripts/post_diff_note.sh \
  --project <id> --mr <iid> \
  --base <sha> --start <sha> --head <sha> \
  --path <file> [--old-path <file>] \
  --line <new_line> | --old-line <old_line> \
  --body '<comment text>'
```

- `--line` for added/changed lines, `--old-line` for removed lines.
- Token resolved from `GITLAB_TOKEN`, `GITLAB_ACCESS_TOKEN`, `OAUTH_TOKEN`, or `glab auth status`.
- If generic `DiscussionNote` threads were created accidentally, delete and recreate as diff notes.
