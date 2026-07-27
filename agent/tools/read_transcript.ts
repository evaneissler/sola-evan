import { connectSlackCredentials } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Same Connect-backed bot token the Slack channel uses; needed to read
// `url_private` files even in a public workspace.
const credentials = connectSlackCredentials("slack/sola");

export default defineTool({
  description:
    "Download and read a transcript / text file attached to a Slack message (e.g. .txt, .vtt, .srt, .md) and return its text, so you can build the demo steps from it. Use the `fileUrl` from the attached-file context. If the transcript was pasted directly into the Slack message instead, use that message text and do not call this tool.",
  inputSchema: z.object({
    fileUrl: z
      .string()
      .url()
      .describe(
        "The transcript file's Slack url_private / url_private_download from the attached-file context.",
      ),
  }),
  async execute({ fileUrl }, ctx) {
    const { botToken } = credentials;
    const token = await (typeof botToken === "function" ? botToken() : botToken);

    const res = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      signal: ctx.abortSignal,
    });
    if (!res.ok) {
      throw new Error(
        `Failed to download Slack file (${res.status} ${res.statusText}). ` +
          `The bot needs the files:read scope and access to the file.`,
      );
    }

    const text = await res.text();

    // Slack serves an HTML login page (200 OK) when auth fails on a file URL.
    const head = text.slice(0, 200).toLowerCase();
    if (head.includes("<!doctype html") || head.includes("<html")) {
      throw new Error(
        "Slack returned HTML instead of the transcript, which means the download was " +
          "not authenticated. Confirm the bot has files:read and access to the file.",
      );
    }

    return { chars: text.length, text };
  },
});
