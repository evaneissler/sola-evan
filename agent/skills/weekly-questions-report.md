---
description: Use when the user asks for a weekly report of the questions asked (and answered) across a set of Slack channels, e.g. "run the weekly questions report" or "what questions came up this week". Read-only.
---

# Weekly questions report

Produce a read-only weekly report of the questions asked and answered in a list
of Slack channels over the past 7 days. **Do not post, reply, react, or write
anything to Slack.** Only read.

**Never use em dashes anywhere in the report.** Use periods, commas, or
parentheses instead.

## Channels

Report on these channels (use the list the user gives; if they give none,
default to this list). Refer to each channel by its name, never its ID:

- `C08F34JHQJG` = the **YC** channel. Call it "YC".

## Steps

1. For **each** channel, call `search_slack_channel` with `days: 7`.
2. From the returned messages, identify the ones that are **questions**, a
   message ending in `?`, or clearly asking for help, an opinion, a decision, or
   information. Ignore bot noise, join/leave messages, and pure statements.
3. For each question that has `replyCount > 0`, call `read_slack_thread` with
   the channel ID and that message's `ts` (as `threadTs`) to gather the
   answer(s). If `replyCount` is 0, treat the question as **unanswered**.
4. Summarize each thread's answer into 1 to 2 sentences capturing the resolution
   or the most useful response. If unanswered, say so.

## Report format

Output the report in this structure:

**Theme of the week**: One sentence capturing the overall theme across all the
questions asked this week.

**Questions & answers**: For each question, a short entry:

- **Q:** one-line summary of the question. **A:** one to two sentence summary of
  the answer (or "Unanswered").

Group by channel if reporting on more than one (e.g. under a "YC" heading), and
note how many questions were found.

**What this means for startups**: One or two sentences, max. Just the single
most important takeaway for startups from this week's questions. Keep it tight.

## Notes

- If `search_slack_channel` errors with `not_in_channel`, tell the user the bot
  must be invited to that channel, and continue with the remaining channels.
- If it errors with `missing_scope`, the Slack app needs `channels:history`
  (or `groups:history` for private channels).
- Keep the whole report skimmable. Authors appear as Slack IDs, so refer to them
  generically unless specifics matter.
