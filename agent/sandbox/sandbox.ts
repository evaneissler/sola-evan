import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

// The demo hub repo. Cloned once into the template, reused by every session.
// Public repo, so cloning is anonymous; pushing needs GITHUB_TOKEN (see below).
const REPO_URL = "https://github.com/williamarmstrong8/startups-demo-hub.git";
const REPO_DIR = "startups-demo-hub";

/**
 * The sandbox where Sola works on the demo hub.
 *
 * - `bootstrap` runs once per template build: it does a full clone (not shallow,
 *   so pushes are reliable) and installs deps with pnpm, matching the repo's
 *   pnpm-lock.yaml. Bump `revalidationKey` to force a fresh clone/install.
 * - `onSession` runs once per session: it brokers the GitHub push token at the
 *   firewall (the secret never enters the sandbox) and sets the commit identity.
 *
 * Push auth: even though the repo is public, `git push` needs write access.
 * Set GITHUB_TOKEN in the environment to a fine-grained PAT with
 * `contents: write` on williamarmstrong8/startups-demo-hub (your fork).
 */
export default defineSandbox({
  backend: vercel({ resources: { vcpus: 4 } }),
  revalidationKey: () => "demo-hub-clone-v1",

  async bootstrap({ use }) {
    const sandbox = await use();
    await sandbox.run({ command: `git clone ${REPO_URL} ${REPO_DIR}` });
    // The repo is a pnpm project (pnpm-workspace.yaml + pnpm-lock.yaml).
    await sandbox.run({
      command: `cd ${REPO_DIR} && corepack enable && pnpm install --frozen-lockfile`,
    });
  },

  async onSession({ use }) {
    const token = process.env.GITHUB_TOKEN;

    // Without a token, the sandbox still works for adding/building/previewing;
    // only `publish_demo` (which pushes) will fail. Fail loud there, not here.
    if (!token) {
      await use();
      return;
    }

    // Git-over-HTTPS authenticates with Basic `x-access-token:<token>`. The
    // firewall injects this header only for github.com; `"*": []` keeps the
    // rest of egress (npm, the AI gateway) open. The token stays out of the VM.
    const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
    const sandbox = await use({
      networkPolicy: {
        allow: {
          "github.com": [
            { transform: [{ headers: { authorization: `Basic ${basic}` } }] },
          ],
          "*": [],
        },
      },
    });

    await sandbox.run({
      command: `cd ${REPO_DIR} && git config user.name "Sola" && git config user.email "sola@vercel.com"`,
    });
  },
});
