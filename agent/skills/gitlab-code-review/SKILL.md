---
name: gitlab-code-review
description: Post review findings as inline DiffNote threads on GitLab merge request diffs. Use when the user wants code-linked review comments on specific files and lines, not generic MR discussions.
---

# GitLab Inline Review Comments

## Workflow

1. Rename pi session: `/name CR <GLab-Project-Name !MR-Number>`.
2. Collect review findings — each must reference one file and one anchor line in the MR diff.
3. Fetch MR diff refs: `base_sha`, `start_sha`, `head_sha`, target path, and target line.
4. Post with the bundled script (produces real `DiffNote`, not `DiscussionNote`).
5. One issue per thread, anchored to the most relevant changed line.
6. After posting, verify the response shows type `DiffNote`.
7. Add the `ai-reviewed` label to the MR (create the label first if it doesn't exist; ask the user if creation fails).

## Comment Style

- Lead with the issue, not a severity label.
- Use plain English. Avoid vague terms like "clamp", "stale", or "external state" unless code context needs them.
- Be specific: state what breaks and concrete impact.
- Add a GitLab suggestion block when the fix is obvious and small; otherwise give one clear fix direction.
- Wrap code references in backticks (`handleAllLocale`, `src/server.ts`, `SK1`).
- Keep it short: one issue, plain language, concrete impact, one recommendation.
- End every comment with a blank line then `_[ai-reviewed]_`.

Example:

````text
`handleAllLocale` hides the real error here, so partial locale writes can look successful. Log operation + locale + error, then rethrow so the consumer can fail the message.

```suggestion:-0+1
throw error;
```

_[ai-reviewed]_
````

## Posting

```bash
~/.pi/agent/skills/gitlab-code-review/scripts/post_diff_note.sh \
  --project <id> --mr <iid> \
  --base <sha> --start <sha> --head <sha> \
  --path <file> [--old-path <file>] \
  [--line <new_line>] [--old-line <old_line>] \
  --body '<comment text>'
```

- `--line` for added/changed lines; `--old-line` for removed lines.
- Renamed files: inspect `rename from/to` and hunk mapping. For unchanged/context lines, pass both sides: `--old-path <old> --old-line <old_line> --path <new> --line <new_line>`. Added-only lines can use new side; removed-only lines can use old side.
- Verify more than `type: DiffNote`: confirm `position.old_path/old_line/new_path/new_line` are correct. If GitLab UI says "Unable to load the diff", delete and repost with correct old/new anchors.
- If GitLab API returns `500`, still check discussions; note may have been created.
- Token resolved from `GITLAB_TOKEN`, `GITLAB_ACCESS_TOKEN`, `OAUTH_TOKEN`, or `glab auth status`.
- If generic `DiscussionNote` threads were created accidentally, delete and recreate as diff notes.
