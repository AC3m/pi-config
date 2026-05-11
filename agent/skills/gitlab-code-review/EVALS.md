# GitLab Code Review Skill Evals

Keep evals lightweight. Goal: catch regressions in review quality and posting reliability, not build a full QA suite.

## 1. Seeded MR recall

Fixture: small MR with ~5 material issues across app code, tests, and config/CI.

Pass:
- reviews every changed file
- finds at least 4 seeded issues
- posts no style-only comments
- dedupes one root cause into one comment

## 2. No-comment precision

Fixture: formatting-only or harmless refactor MR.

Pass:
- posts 0 comments
- states no material findings

## 3. Posting contract

Fixture: one comment body with Markdown, a suggestion block, and a semicolon.

Pass:
- script preserves full body via `--body-file`
- creates `DiffNote`, not `DiscussionNote`
- anchor `position` matches intended path and line
- body ends with `_[ai-reviewed]_`

## Metrics

- Material recall: seeded issues found / seeded issues
- Precision: material comments / posted comments
- Anchor accuracy: correct DiffNote positions / posted comments

## Manual pre-post checklist

- Every changed file reviewed
- Each finding has concrete impact
- No cosmetic/style-only comments
- Each anchor is on a changed diff line
- Each body ends with blank line then `_[ai-reviewed]_`
