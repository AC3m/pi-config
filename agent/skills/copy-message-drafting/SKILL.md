---
name: copy-message-drafting
description: Drafts copy-ready Slack messages and emails using rich-text-friendly Markdown inside copy tags. Use when the user asks to draft, write, rewrite, or prepare a Slack message, email, announcement, update, or copyable text.
---

# Copy Message Drafting

When drafting Slack messages, emails, announcements, updates, or other copyable prose, wrap the final copyable text in copy tags so the snippet-copy extension can capture it.

## Required output format

Use exactly one tagged block for the final draft:

```md
<copy-msg>
# Short title if useful

Message body here.
</copy-msg>
```

`<copy-msg>` is the authoring convention. The copy extension also accepts `<copy-txt>` as an alias.

## Rich text style

Inside the tag, use Slack/email friendly Markdown:

- `# Heading` for a strong title when useful
- `**bold**` for emphasis
- `- bullet` for lists
- `- [ ] task` / `- [x] task` for checklist-style updates
- `[label](https://example.com)` for links
- fenced code blocks only when code/commands are meant to be copied

## Rules

- Put only copyable draft content inside `<copy-msg>`.
- Keep explanations, caveats, or alternatives outside the tag.
- Do not include the tags inside the copied prose itself beyond the wrapper.
- If user asks for multiple variants, use one `<copy-msg>` block per variant with a short heading inside each.
- Prefer concise, natural language over over-formatted text.

## Example

<copy-msg>
# Deployment update

**Good news:** the dashboard deployment is complete.

- Smoke tests passed
- Metrics ingestion is healthy
- No user-facing issues detected

I’ll keep monitoring for the next hour and post if anything changes.
</copy-msg>
