import { connectSlackCredentials } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Reuse the same Connect-backed bot token the Slack channel uses.
const credentials = connectSlackCredentials("slack/sola");

const SLACK_API = "https://slack.com/api";

type SlackMessage = {
  type?: string;
  subtype?: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
  reply_count?: number;
};

export default defineTool({
  description:
    "Read a Slack channel's recent messages by channel ID. Returns the messages posted in the last N days (default 7), oldest first, so they can be summarized. Requires the bot to be a member of the channel and the channels:history (or groups:history for private channels) scope.",
  inputSchema: z.object({
    channelId: z
      .string()
      .min(1)
      .describe("The Slack channel ID, e.g. C0123456789."),
    days: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(7)
      .describe("How many days of history to fetch. Defaults to 7."),
  }),
  async execute({ channelId, days }, ctx) {
    // `botToken` may be a static string or a function that fetches a fresh
    // token from Connect on each call.
    const { botToken } = credentials;
    const token = await (typeof botToken === "function" ? botToken() : botToken);
    const oldest = ((Date.now() - days * 24 * 60 * 60 * 1000) / 1000).toFixed(6);

    const messages: SlackMessage[] = [];
    let cursor: string | undefined;

    // Page through history until we've read the whole window (cap the pages
    // so a very busy channel can't run away).
    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({
        channel: channelId,
        oldest,
        limit: "200",
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${SLACK_API}/conversations.history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctx.abortSignal,
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        messages?: SlackMessage[];
        response_metadata?: { next_cursor?: string };
      };

      if (!data.ok) {
        throw new Error(
          `Slack conversations.history failed: ${data.error ?? "unknown_error"}`,
        );
      }

      for (const m of data.messages ?? []) messages.push(m);

      cursor = data.response_metadata?.next_cursor || undefined;
      if (!cursor) break;
    }

    // Oldest first for a readable, chronological summary.
    messages.sort((a, b) => Number(a.ts ?? 0) - Number(b.ts ?? 0));

    return {
      channelId,
      days,
      messageCount: messages.length,
      messages: messages.map((m) => ({
        ts: m.ts,
        // A message is either from a user or a bot; surface whichever we have.
        author: m.user ?? m.bot_id ?? "unknown",
        text: m.text ?? "",
        replyCount: m.reply_count ?? 0,
      })),
    };
  },
});
