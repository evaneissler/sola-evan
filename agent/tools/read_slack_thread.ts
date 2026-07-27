import { connectSlackCredentials } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Reuse the same Connect-backed bot token the Slack channel uses.
const credentials = connectSlackCredentials("slack/sola");

const SLACK_API = "https://slack.com/api";

type SlackMessage = {
  user?: string;
  bot_id?: string;
  text?: string;
  ts?: string;
};

export default defineTool({
  description:
    "Read the replies in a Slack thread by channel ID and the parent message timestamp (thread_ts). Returns the parent message followed by its replies, oldest first. Read-only. Use this to find the answers given to a question posted in a channel.",
  inputSchema: z.object({
    channelId: z
      .string()
      .min(1)
      .describe("The Slack channel ID, e.g. C0123456789."),
    threadTs: z
      .string()
      .min(1)
      .describe(
        "The timestamp (ts) of the parent message that started the thread, e.g. 1712345678.123456.",
      ),
  }),
  async execute({ channelId, threadTs }, ctx) {
    const { botToken } = credentials;
    const token = await (typeof botToken === "function" ? botToken() : botToken);

    const replies: SlackMessage[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < 10; page++) {
      const params = new URLSearchParams({
        channel: channelId,
        ts: threadTs,
        limit: "200",
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`${SLACK_API}/conversations.replies?${params}`, {
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
          `Slack conversations.replies failed: ${data.error ?? "unknown_error"}`,
        );
      }

      for (const m of data.messages ?? []) replies.push(m);

      cursor = data.response_metadata?.next_cursor || undefined;
      if (!cursor) break;
    }

    // conversations.replies already returns the parent first, replies in order.
    return {
      channelId,
      threadTs,
      messageCount: replies.length,
      messages: replies.map((m) => ({
        ts: m.ts,
        author: m.user ?? m.bot_id ?? "unknown",
        text: m.text ?? "",
      })),
    };
  },
});
