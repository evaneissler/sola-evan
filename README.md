# sola

An [eve](https://eve.dev) agent that produces a **weekly report of the questions
asked (and answered) in Slack channels**, and posts it on a schedule.

The agent reads a channel's last 7 days of messages, pulls out the questions and
their thread answers, and writes a report with:

1. **Theme of the week** — one sentence on the overall theme of the questions.
2. **Questions & answers** — a short Q/A summary for each question.
3. **What this means for startups** — one to two sentences, the single most
   important takeaway.

Reading Slack is **read-only**. The agent never posts, replies, or reacts while
gathering the report. The only outbound message is the scheduled report itself,
delivered by the Slack channel adapter.

## Layout

```
agent/
  agent.ts                          # agent definition (model)
  instructions.md                   # base system prompt
  channels/
    slack.ts                        # Slack channel (Connect-backed bot token)
    eve.ts                          # eve channel
  connections/
    notion.ts                       # Notion MCP connection
  tools/
    search_slack_channel.ts         # read a channel's recent messages (read-only)
    read_slack_thread.ts            # read a thread's replies (read-only)
  skills/
    weekly-questions-report.md      # how to build the report
  schedules/
    weekly-questions-report.ts      # Tuesdays 9am EST -> post to a channel
```

## Tools

Both tools reuse the same Connect-backed Slack bot token as the channel
(`slack/sola`), so there are no extra secrets to manage. Both are read-only.

### `search_slack_channel`

Reads a channel's recent messages by channel ID.

- **Input:** `channelId` (e.g. `C0123456789`), `days` (default `7`, max `30`).
- **Returns:** messages oldest→newest with `author`, `text`, `ts`, and
  `replyCount`, plus `messageCount`. Pages through history via
  `conversations.history`.

### `read_slack_thread`

Reads the replies in a thread, used to find the answers to a question.

- **Input:** `channelId`, `threadTs` (the parent message `ts`).
- **Returns:** the parent message followed by its replies, oldest→newest, via
  `conversations.replies`.

## Skill

### `weekly-questions-report`

Orchestrates the report: for each channel, call `search_slack_channel` for the
last 7 days, identify the questions, call `read_slack_thread` on any question
with replies to gather answers, then write the report in the format above.

- Channel `C08F34JHQJG` is the **YC** channel and is referred to as "YC" (never
  by ID).
- The report never uses em dashes.

## Schedule

### `weekly-questions-report`

Runs **Tuesdays at 9am EST** (`cron: "0 14 * * 2"`) and posts the report to
channel `C0BFPPD9222` via the Slack channel adapter.

> **Daylight saving:** cron runs in fixed UTC (`14:00`), which is 9am *EST*
> (winter). During EDT (summer) it fires at 10am ET. Use `"0 13 * * 2"` for 9am
> during EDT instead. Cron cannot auto-switch between the two.

The bot must be a **member** of the target channel `C0BFPPD9222` and have
`chat:write` for delivery to succeed.

## Slack scopes

The bot token needs:

- `channels:history` — read public channel messages (and `groups:history` for
  private channels).
- `chat:write` — post the scheduled report to the target channel.

The bot must also be **invited to every channel** it reads or posts to. If a
read fails with `not_in_channel`, invite the bot; if it fails with
`missing_scope`, add the scope above to the Slack app.

## Development

```bash
npm run dev        # eve dev (schedules do NOT fire on their cron here)
npm run build      # eve build
npm run start      # eve start (production schedules fire)
npm run typecheck  # tsc
```

Schedules only fire in a deployed/`eve start` build. While iterating, trigger a
scheduled run once, out of band, via the dev dispatch route:

```bash
curl -X POST http://localhost:2000/eve/v1/dev/schedules/weekly-questions-report
```

## Deploy

```bash
VERCEL_USE_EXPERIMENTAL_FRAMEWORKS=1 vercel deploy --prod
```

On Vercel each schedule becomes a Cron Job (confirm under **Settings → Cron
Jobs**; runs show under **Observability → Cron Jobs**).
# sola
