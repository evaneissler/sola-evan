import { connectSlackCredentials } from "@vercel/connect/eve";
import { defaultSlackAuth, slackChannel } from "eve/channels/slack";

// A file attached to a Slack message. Slack includes these on `app_mention`
// events when the mentioning message also uploaded files (needs `files:read`).
type SlackFile = {
  id?: string;
  name?: string;
  title?: string;
  mimetype?: string;
  filetype?: string;
  size?: number;
  url_private?: string;
  url_private_download?: string;
};

const VIDEO_TYPES = ["mp4", "mov", "webm", "m4v"];
const TEXT_TYPES = ["txt", "text", "vtt", "srt", "md", "markdown"];

function roleOf(f: SlackFile): "VIDEO" | "TRANSCRIPT" | "FILE" {
  if (f.mimetype?.startsWith("video/") || VIDEO_TYPES.includes(f.filetype ?? ""))
    return "VIDEO";
  if (f.mimetype?.startsWith("text/") || TEXT_TYPES.includes(f.filetype ?? ""))
    return "TRANSCRIPT";
  return "FILE";
}

/** Render attached files, tagged by role, as background the model can act on. */
function describeFiles(files: SlackFile[]): string[] | null {
  if (files.length === 0) return null;

  const lines = files.map((f, i) => {
    const url = f.url_private_download ?? f.url_private ?? "(no url)";
    const size = f.size ? `${(f.size / 1_000_000).toFixed(1)}MB` : "unknown size";
    return `${i + 1}. [${roleOf(f)}] name="${f.name ?? f.title ?? "file"}" type=${f.mimetype ?? f.filetype ?? "?"} ${size} fileUrl=${url}`;
  });

  return [
    [
      "The user attached the following file(s) to this message:",
      ...lines,
      "",
      "To add a demo, follow the `demo-hub-upload` skill:",
      "- VIDEO: pass its `fileUrl` to the `stage_video` tool.",
      "- TRANSCRIPT: pass its `fileUrl` to the `read_transcript` tool to read the text,",
      "  then build the demo steps from it. If the transcript was pasted into the",
      "  message text instead of attached, use that text and skip `read_transcript`.",
      "Do not print raw fileUrls back to the user.",
    ].join("\n"),
  ];
}

export default slackChannel({
  credentials: connectSlackCredentials("slack/sola"),

  // On an @mention, dispatch a turn and, when files are attached, inject their
  // metadata as background context so Sola knows there's a video to work with.
  onAppMention(ctx, message) {
    if (!message.author) return null;
    const auth = defaultSlackAuth(message, ctx);

    const files = (message.raw as { files?: SlackFile[] })?.files ?? [];
    const context = files.length > 0 ? describeFiles(files) : null;

    return context ? { auth, context } : { auth };
  },
});
