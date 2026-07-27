import { connectSlackCredentials } from "@vercel/connect/eve";
import { defineTool } from "eve/tools";
import { z } from "zod";

// Same Connect-backed bot token the Slack channel uses. Needed to download
// `url_private` files, which require Authorization even for public workspaces.
const credentials = connectSlackCredentials("slack/sola");

const REPO_DIR = "startups-demo-hub";

export default defineTool({
  description:
    "Download a video that was attached to a Slack message and write it into the demo hub repo at public/demos/<slug>.mp4, ready to be committed. Use the `fileUrl` from the attached-file context and a kebab-case slug derived from the demo title.",
  inputSchema: z.object({
    fileUrl: z
      .string()
      .url()
      .describe(
        "The file's Slack url_private / url_private_download from the attached-file context.",
      ),
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "kebab-case: lowercase letters, numbers, and single hyphens",
      )
      .describe(
        "Kebab-case slug for the demo, e.g. 'build-a-startup-landing-page-with-v0'. The file lands at public/demos/<slug>.mp4.",
      ),
  }),
  async execute({ fileUrl, slug }, ctx) {
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

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      // Slack returns an HTML login page (200 OK) when auth fails on a file URL.
      throw new Error(
        "Slack returned HTML instead of the video, which means the download was " +
          "not authenticated. Confirm the bot has files:read and access to the file.",
      );
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${REPO_DIR}/public/demos/${slug}.mp4`;

    const sandbox = await ctx.getSandbox();
    await sandbox.writeBinaryFile({ path, content: bytes });

    return {
      path,
      publicPath: `/demos/${slug}.mp4`,
      bytes: bytes.byteLength,
      note: "Video staged. Register it in lib/demos/ and run the build before publishing.",
    };
  },
});
