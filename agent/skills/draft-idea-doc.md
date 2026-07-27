---
description: Use when someone pitches an idea for a demo or build guide in Slack, e.g. "@sola I have an idea ...". Turns the pitch into a structured build-guide draft in Notion and replies with the link, so the team can refine it before it becomes a demo hub build guide.
---

# Draft an idea into a Notion build-guide doc

Someone has an idea for a demo hub build guide. Your job is to turn their pitch into a
well-structured **Notion page** that mirrors the shape of a published build guide, then
reply in Slack with the link. The team edits that doc, and later sends it back to be
built into a real `/g/<slug>` page on the demo hub (the `build-guide-from-doc` skill).

Because that doc is the source for the published page, structure it the same way a guide
is structured. The closer the doc matches the guide shape, the cleaner the later build.

## What to write

From the user's pitch, draft the content below. Keep the voice concise, concrete, and
**free of em dashes** (matches the site style). Do not invent specifics the user did not
give — where a detail is unknown, write a short `TODO:` the team can fill in. It is fine
for a first draft to be mostly scaffolding with good prompts for the team.

- **Title** — a clear, action-oriented guide title, e.g. "Build a personal AI assistant
  with Eve". This is the Notion page title.
- **Summary** — one or two sentences on what the guide teaches and the end result.
- **Tags** — 3 to 5 short tags (tools, concepts).
- **At a glance** — four short rows:
  - *What you build* — the concrete end artifact.
  - *What you need* — accounts, tools, credits required.
  - *What it covers* — the key concepts or steps.
  - *How long it takes* — a rough time estimate.
- **Requirements** — the software and accounts needed, each with a one-line note and,
  where known, a link.
- **Steps** — an ordered list of 4 to 7 build steps. For each step: a short title, a one
  or two sentence description, and, where relevant, the exact **command**, **prompt**, or
  **code** involved (as Notion code blocks). This is the heart of the guide.

## How to create the doc

1. Draft the content above from the pitch.
2. Use the **Notion connection** to create a new page with that content. Discover the
   connection's tools with `connection_search` (they are exposed as `notion__...`) and
   use its create-page tool. Set the page title to the guide title. Render the structure
   with Notion blocks: headings for each section, a bulleted or table layout for "At a
   glance" and "Requirements", numbered steps, and code blocks for any command / prompt /
   code. Create the page at the workspace root (a new standalone page) unless the user
   points you at a specific parent.
3. Reply in Slack with the Notion page URL, a one-line summary of the idea, and an
   invitation to edit it and send the link back when it is ready to build and publish.

## Notes

- **First-time Notion auth.** The Notion connection is user-scoped, so the first time a
  given person triggers it, a Notion authorization link appears in Slack. Tell them to
  click it once to connect Notion; the run resumes automatically after they approve.
- Do **not** build or publish anything to the demo hub in this skill. This step only
  produces the Notion draft. Publishing happens later, from the edited doc, via the
  `build-guide-from-doc` skill.
- If the pitch is too thin to draft meaningfully, ask one brief `ask_question` to get the
  core of the idea (what it builds and what tools it uses) before creating the doc.
