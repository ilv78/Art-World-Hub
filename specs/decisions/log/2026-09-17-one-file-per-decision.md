---
date: 2026-09-17
title: Decision log moves from one append-only table to one file per decision
issue: 808
category: Process
---

Agent dispatches have run strictly one at a time since #753 — `concurrency: agent-run` in
`agent-dispatch.yml` — and the developer asked why. The honest answer was that the
serialisation is a workaround, not a GitHub property: every agent PR appended a row to
`specs/decisions/DECISION-LOG.md`, two appends to one file always conflict in git, and
#749/#750 conflicted #751 for real the day before the dispatcher existed. Running one
agent at a time was the cheapest way to stop a steady stream of DIRTY PRs.

That workaround became the bottleneck: three issues labelled together took ~40 minutes
in sequence where ~15 in parallel would do; the one-deep shared queue is what dropped
every third label (#788); and each run finishing after the previous merge left its PR
BEHIND (#793). All three are symptoms of one choice.

**Chosen:** one file per decision under `specs/decisions/log/`, `YYYY-MM-DD-<slug>.md`,
with frontmatter `date`/`title`/`issue`/`category` and the reasoning as the body. New
files merge without conflict. The historical table is frozen with 135 rows — this
decision is its last — and a header note pointing here.

**Rejected: a committed index.** Regenerating `INDEX.md` in every PR reintroduces the
single-file conflict; a bot committing it to `main` on push would need to bypass branch
protection. Instead `script/decision-log.mjs` renders the index on demand and `--check`
validates entries in CI. The directory *is* the index.

**Consequences accepted.** `CLAUDE.md`'s rule, `DOC-AGENT-SPEC.md` C-003, the autonomy
policy and the pipeline doc all change in the same PR. The pipeline row "conflict on
`DECISION-LOG.md` → rebase and retry" is retired because its cause is gone;
`package-lock.json` keeps its row. The concurrency change itself (per-issue groups, a
max-concurrent bound) follows in a separate, gated PR — agents must be writing here
*before* they run in parallel, or the last sequential runs would still collide on the
table.

**To reverse:** re-enable appends to the table and restore `concurrency: agent-run`. Two
files. The per-decision files would remain valid history either way.
