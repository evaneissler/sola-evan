---
description: Use when someone gives a Notion doc (a link) and asks to turn it into a published build guide on the demo hub, e.g. "@sola build this guide <notion link>" or "publish this doc to the hub". Reads the Notion doc, generates the /g/<slug> guide page, lists it in the Build Guides section on /skills, builds, and publishes.
---

# Build a demo hub guide from a Notion doc

The team drafted a build guide in Notion (usually via the `draft-idea-doc` skill) and
edited it. Your job: read that doc and turn it into a published `/g/<slug>` **build guide
page** on the demo hub that looks like the existing guides, and list it in the "Build
guides" section on `/skills`. This is a **guide page with no video** (a recording can be
added later via `demo-hub-upload`).

The demo hub clone lives in the sandbox at `startups-demo-hub/`. Edit the site's actual
source there with the built-in sandbox tools (`read_file`, `write_file`, `glob`, `grep`,
`bash`): create new files with `write_file`, and change existing files
(`lib/demos/index.ts`, `content/g/_meta.js`) by reading them, adding your line, and
writing them back. Publishing is the same approval-gated push as the demo flow
(`publish_demo`).

## 1. Read the Notion doc

Use the **Notion connection** (discover its tools with `connection_search`; they are
exposed as `notion__...`) to fetch the page from the URL the user gave. Pull out:

- **title**, **summary**, **tags**
- **At a glance** highlights (What you build / need / it covers / how long)
- **Requirements** (tools and accounts, with notes and links)
- the ordered **steps**: each step's title, description, and any command / prompt / code

If the Notion connection prompts for authorization (it is user-scoped), tell the user to
click the link once; the run resumes after they approve.

## 2. Sync the repo

The sandbox may be reused, so start from a clean, current `main`:

```bash
cd startups-demo-hub && git fetch origin main && git reset --hard origin/main && git clean -fd
```

## 3. Create the four files

**First, read the reference guide and match its formatting.** Before writing anything,
read the existing gold-standard guide and its shell so your output matches it exactly:

```bash
cd startups-demo-hub
cat lib/demos/build-a-personal-ai-assistant-with-eve.tsx   # the meta + DemoSteps shape
cat content/g/build-a-personal-ai-assistant-with-eve.mdx   # the 11-line shell
```

Mirror that file's patterns: the `demoMeta` field set (title/date/tags/summary/hosts/
highlights/requirements/hasGuide/steps), how `<Step>` sections interleave `<Description>`
with `<Command>` / `<Code>` / `<Prompt>`, where the `<Requirements>` grid goes, and the
concise, no-em-dash voice. Map the Notion doc's content onto that same structure. The
template below is only a skeleton; the alfred file is the real reference.

Pick a kebab-case **slug** from the title (e.g. "Build a personal AI assistant with Eve"
→ `build-a-personal-ai-assistant-with-eve`).

### a. `lib/demos/<slug>.tsx`

Export `demoMeta` (with `hasGuide: true`, no `recording`) and `DemoSteps()`. The `<Step>`
ids must match `demoMeta.steps` exactly. Author the body from the doc using the guide
component vocabulary (below). Keep the voice concise and **use no em dashes**.

```tsx
import type { DemoMeta } from '@/components/guide/types'
import { Step, Description, Command, Code, Prompt, Requirements } from '@/components/guide'
import { william, neha } from './hosts'

export const demoMeta: DemoMeta = {
  slug: '<slug>',
  title: '<Title>',
  date: '<Month D, YYYY>', // today's date
  summary: '<One or two sentences. No em dashes.>',
  tags: ['<tag>', '<tag>'],
  hosts: [william],
  hasGuide: true,
  highlights: [
    { label: 'What you build', value: '<...>' },
    { label: 'What you need', value: '<...>' },
    { label: 'What it covers', value: '<...>' },
    { label: 'How long it takes', value: '<...>' }
  ],
  requirements: [
    // brand MUST be a valid BrandId — see note below. Omit a row if unsure.
    { brand: 'vercel', name: 'Vercel', note: '<what it is for>', href: 'https://vercel.com', action: 'Sign up' }
  ],
  steps: [
    { id: 'overview', title: 'Overview' },
    { id: 'requirements', title: 'What you need' },
    { id: 'build', title: 'Build it' },
    { id: 'ship', title: 'Ship it' }
  ]
  // No `recording` — this is a video-less guide.
}

export function DemoSteps() {
  return (
    <>
      <Step id="overview" title="Overview">
        <Description>{/* from the doc */}</Description>
      </Step>
      <Step id="requirements" title="What you need">
        <Requirements items={demoMeta.requirements ?? []} />
      </Step>
      <Step id="build" title="Build it">
        <Description>{/* ... */}</Description>
        <Command>{`npx some-command`}</Command>
        <Code lang="ts" filename="example.ts">{`// code from the doc`}</Code>
        <Prompt tool="Claude">{`a prompt from the doc`}</Prompt>
      </Step>
      <Step id="ship" title="Ship it">
        <Description>{/* ... */}</Description>
      </Step>
    </>
  )
}
```

**Component vocabulary** (all from `@/components/guide`):

- `<Description>` — prose; inline `<ul>`, `<a>`, `<code>`, `<strong>` are fine.
- `<Command lang="bash">{`...`}</Command>` — a shell command (template literal).
- `<Code lang="ts" filename="file.ts">{`...`}</Code>` — a code/file block; use a template
  literal so braces are safe.
- `<Prompt tool="Claude">{`...`}</Prompt>` — an AI/agent prompt; `tool` is a label.
- `<Requirements items={demoMeta.requirements ?? []} />` — renders the requirements grid.

### b. Register in `lib/demos/index.ts`

Add the import and an entry in the `demos` record (put it first; declaration order is
display order). This is required — the route, TOC, and `/skills` link all read the demo
through `getDemo(slug)`.

### c. `content/g/<slug>.mdx` (this is what creates the `/g/<slug>` route)

```mdx
---
title: <Title>
description: <one-line description of the guide>
---
import { Guide } from '../../components/guide'
import { demoMeta, DemoSteps } from '../../lib/demos/<slug>'

<Guide meta={demoMeta}>
  <DemoSteps />
</Guide>
```

### d. Add the sidebar label in `content/g/_meta.js`

Add one line so it appears in the "Build guides" section on `/skills`:

```js
'<slug>': '<Sidebar label>',
```

## 4. Build, publish, reply

1. **Build to verify:** `cd startups-demo-hub && pnpm build`. Fix any type/build error
   (mismatched step ids and invalid requirement brands are the usual culprits) and build
   again. Only publish after a clean build.
2. **Publish:** call `publish_demo` (asks for approval in Slack) with a message like
   `Add build guide: <title>`.
3. **Reply** with the live URL:
   `https://startups-demo-hub.playground-vercel.tools/g/<slug>`, note the deploy
   takes a minute, and mention a video can be added later to also feature it on the hub.

## Notes and failure modes

- **`requirements[].brand` must be a valid `BrandId`.** The allowed ids live in
  `components/guide/brand-logos.tsx` — `grep` it for the list. If a needed brand is not
  there, either add it to that file or omit that requirement row. An invalid brand fails
  the build.
- **Video-less is expected.** The guide will not show on the hub home grid (that needs
  `recording.src`) until a video is added. The `/g/<slug>` page and the `/skills` "Build
  guides" link work without one.
- **Removing a guide** reverses the four files: delete `lib/demos/<slug>.tsx` and
  `content/g/<slug>.mdx`, and remove the entries from `lib/demos/index.ts` and
  `content/g/_meta.js`. Then build and `publish_demo`.
- Do not invent details the doc does not contain. If the doc still has `TODO:` markers or
  is missing steps, tell the user what is missing instead of guessing.
