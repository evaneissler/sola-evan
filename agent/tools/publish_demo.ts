import { always } from "eve/tools/approval";
import { defineTool } from "eve/tools";
import { z } from "zod";

const REPO_DIR = "startups-demo-hub";

/**
 * Commits the current working tree in the demo hub repo and pushes to `main`,
 * which triggers a production deploy on Vercel. Used for both adding and
 * removing a demo — whatever the staged changes are.
 *
 * Gated with `always()`: Sola pauses and shows the human an Approve/Deny button
 * in Slack (with the commit message and file list) before anything goes live.
 * Pushing needs GITHUB_TOKEN with write access; the sandbox brokers it at the
 * firewall (see agent/sandbox/sandbox.ts).
 */
export default defineTool({
  description:
    "Commit the staged changes in the demo hub repo and push to main, which deploys the live site. Call this only after editing lib/demos and running a successful build. Requires human approval.",
  inputSchema: z.object({
    commitMessage: z
      .string()
      .min(1)
      .describe(
        "Concise commit message, e.g. 'Add demo: build a startup landing page with v0' or 'Remove demo: <slug>'.",
      ),
  }),
  approval: always(),
  async execute({ commitMessage }, ctx) {
    const sandbox = await ctx.getSandbox();

    const run = async (command: string) => {
      const result = await sandbox.run({ command: `cd ${REPO_DIR} && ${command}` });
      return result;
    };

    // Nothing staged? Report cleanly instead of failing an empty commit.
    const status = await run("git status --porcelain");
    if (!status.stdout.trim()) {
      return { pushed: false, reason: "No changes to publish — the working tree is clean." };
    }

    await run("git add -A");
    // Quote via a heredoc-free approach: escape double quotes in the message.
    const safeMessage = commitMessage.replace(/"/g, '\\"');
    await run(`git commit -m "${safeMessage}"`);

    const push = await run("git push origin main");
    const sha = (await run("git rev-parse --short HEAD")).stdout.trim();

    return {
      pushed: true,
      commit: sha,
      pushOutput: `${push.stdout}\n${push.stderr}`.trim(),
      note: "Pushed to main. Vercel is deploying; the change is live once the deploy finishes.",
    };
  },
});
