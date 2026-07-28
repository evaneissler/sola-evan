---
description: Use when someone asks to add a demo video to the demo hub, or to remove one. Handles the full flow in the Vercel sandbox which is sync the repo, stage the video, register or unregister the demo, build to verify, and publish to the live site. Triggers on "@sola put this in the demo hub", "add this video", "remove that demo", etc.
---

# Demo hub: add and remove demos

You maintain the **startups-demo-hub** site (https://startups-demo-hub.playground-vercel.tools).
A full clone lives in the sandbox at `startups-demo-hub/` (i.e. `/workspace/startups-demo-hub`).
Publishing means committing and pushing to `main`, which auto-deploys on Vercel.

Use the built-in sandbox tools (`bash`, `read_file`, `write_file`, `glob`, `grep`)
to work inside that directory. Do **not** touch this eve app's own files.

## How the repo represents a demo

A demo is exactly **three** things. Adding creates all three; removing deletes all three.
Everything else (the `/demo/[slug]` route, the hub grid, the search index) is derived
automatically from the registry, so there is nothing else to edit.

1. **The video**: `public/demos/<slug>.mp4` (committed to git — that is the existing
   pattern; the repo already holds the other demo mp4s).
2. **The demo module**: `lib/demos/<slug>.tsx`, exporting `demoMeta: DemoMeta` and
   `DemoSteps()`.
3. **The registry entry**: an import + a key in the `demos` record in `lib/demos/index.ts`.
   **Declaration order is display order**, so a new demo goes **first** (newest on top).

A demo only appears on the hub if its `demoMeta.recording.src` is set — always set it
to `/demos/<slug>.mp4`.

## Always start by syncing

The sandbox may be reused across conversations, so sync to the latest `main` before
any edit. This also discards any half-finished work from a previous turn:

```bash
cd startups-demo-hub && git fetch origin main && git reset --hard origin/main && git clean -fd
```

## Adding a demo

The user provides **both a video and a transcript** in the message. Build the steps
from the transcript; do not transcribe anything yourself.

1. **Get the transcript.** It arrives one of two ways:
   - **Pasted into the message text** — use it directly.
   - **Attached as a file** (`[TRANSCRIPT]` in the attached-file context, e.g. `.txt`,
     `.vtt`, `.srt`) — call `read_transcript` with its `fileUrl` to read the text.
2. **Pick a slug.** Kebab-case from the title, e.g. "Build a startup landing page with
   v0" → `build-a-startup-landing-page-with-v0`. If the user gave no title, infer one
   from the transcript or filename and confirm it with a brief `ask_question`.
3. **Stage the video.** Call `stage_video` with the `[VIDEO]` `fileUrl` and your slug.
   It lands at `public/demos/<slug>.mp4`.
4. **Build the steps from the transcript** (see "Authoring steps" below), then **create
   `lib/demos/<slug>.tsx`** in the shape shown. At minimum set `slug`, `title`, `date`,
   `summary`, `tags`, `hosts`, `steps`, and `recording`. Default the host to `william`
   (the repo owner) unless told otherwise; `william` and `neha` are exported from
   `./hosts`. Keep `summary` to one or two sentences and **use no em dashes** anywhere.
5. **Register it** in `lib/demos/index.ts`: add the import and put its entry **first**
   in the `demos` object.
6. **Build to verify** (below). Fix any type or build error before publishing.
7. **Publish** with `publish_demo` (this asks the user to approve in Slack). Use a
   commit message like `Add demo: <title>`.
8. Reply with the live URL: `https://startups-demo-hub.playground-vercel.tools/demo/<slug>`,
   and note the deploy takes a minute.

### Authoring steps from the transcript

Turn the transcript into a handful of chapters (aim for 4 to 7 steps, not one per
sentence). For each chapter write a short, skimmable `<Step>` title and a one or two
sentence `<Description>` capturing what happens in that part of the demo. Match the
editorial voice of the existing demos: concise, concrete, no em dashes.

Set the tap times by how the transcript is formatted:

- **Timestamped transcript** (`.vtt` / `.srt`, or lines like `00:01:23.000 --> ...`, or
  `[00:12]` markers): convert each chapter's start to **seconds** and use it for that
  step's `taps[].t`. Derive `recording.duration` from the final timestamp.
- **Plain text, no timestamps:** still create the chapters, but you cannot know exact
  times. Set `taps` conservatively (e.g. all `t: 0`, or omit `taps`) and mention in your
  reply that step timings are approximate and can be refined by re-sending with
  timestamps.

### Minimal `lib/demos/<slug>.tsx`

```tsx
import type { DemoMeta } from '@/components/guide/types'
import { Step, Description } from '@/components/guide'
import { william, neha } from './hosts'

export const demoMeta: DemoMeta = {
  slug: '<slug>',
  title: '<Title>',
  date: '<Month D, YYYY>',
  summary: '<One or two sentences. No em dashes.>',
  tags: ['<tag>', '<tag>'],
  hosts: [william],
  // One entry per chapter you derived from the transcript.
  steps: [
    { id: 'intro', title: 'Intro' },
    { id: 'build', title: 'Build the thing' },
    { id: 'ship', title: 'Ship it' }
  ],
  recording: {
    src: '/demos/<slug>.mp4',
    duration: 0, // seconds, from the final transcript timestamp when available
    // One tap per step; t is the chapter start in seconds.
    taps: [
      { stepId: 'intro', t: 0 },
      { stepId: 'build', t: 0 },
      { stepId: 'ship', t: 0 }
    ]
  }
}

// One <Step> per chapter, in order, sourced from the transcript.
export function DemoSteps() {
  return (
    <>
      <Step id="intro" title="Intro">
        <Description>
          {/* One or two sentences on this chapter, from the transcript. */}
        </Description>
      </Step>
      <Step id="build" title="Build the thing">
        <Description>{/* ... */}</Description>
      </Step>
      <Step id="ship" title="Ship it">
        <Description>{/* ... */}</Description>
      </Step>
    </>
  )
}
```

The `steps` ids in `demoMeta.steps` must match the `<Step id=...>` ids in `DemoSteps`,
and every `taps[].stepId` must be one of those ids.

## Removing a demo

1. Delete the three things:
   ```bash
   cd startups-demo-hub && git rm public/demos/<slug>.mp4 lib/demos/<slug>.tsx
   ```
2. Edit `lib/demos/index.ts`: remove that demo's `import` line and its entry in the
   `demos` object.
3. **Build to verify**, then **publish** with `publish_demo` and a message like
   `Remove demo: <slug>`.

If you are unsure of the exact slug, `grep -rl "<title words>" lib/demos` or list
`public/demos/` and `lib/demos/` to find it.

## Building to verify

Always build before publishing so a broken demo never reaches the live site:

```bash
cd startups-demo-hub && pnpm build
```

`pnpm build` runs `next build` (deps are already installed in the sandbox). A clean
exit means the registry, types, and page all compile. If it fails, read the error,
fix the module or the registry, and build again. Only call `publish_demo` after a
successful build.

## Notes and failure modes

- **This is a multi-turn flow.** "Add it so I can see it" then "now remove it" are two
  turns in the same Slack thread and the same session. Because you sync from `origin/main`
  at the start of each flow, add and remove both work correctly even across sessions.
- **`stage_video` or `read_transcript` returned HTML / a 401**: the Slack app is missing
  the `files:read` scope, or the bot cannot access the file. Tell the user to add
  `files:read`.
- **Video attached but no transcript** (not pasted, no `[TRANSCRIPT]` file): ask the user
  for the transcript before building the page, rather than inventing the steps.
- **`publish_demo` push fails with auth**: `GITHUB_TOKEN` (write access to the repo) is
  not configured in the environment. Say so plainly; do not retry.
- Never print raw `url_private` file URLs or tokens back into Slack.
