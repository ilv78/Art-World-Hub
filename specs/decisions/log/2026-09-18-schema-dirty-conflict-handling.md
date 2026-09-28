---
date: 2026-09-18
title: Make schema/migration DIRTY conflicts self-service; defer the async-detection half to a human
issue: 820
category: Process
---

#820 recorded a finding from the #808 parallel-dispatch acceptance test: #538 and #509
both branched from the same `main` and generated colliding `migrations/0015_*.sql`
numbers, and once that was renumbered, #509's `exhibition-detail.tsx` built a placeholder
artist object that failed `tsc` because #538 had added a required `artists.updatedAt`
field — a type-shape break invisible until both PRs' code coexisted. Both were fixed by
hand at the time. The issue offered three directions and explicitly left the choice open.

## What was chosen

**Direction 2** (teach the agent to resolve this itself): `specs/AGENT-AUTONOMY-POLICY.md`
§6 now has a standing rule — a schema/migration-touching PR that goes `DIRTY` against
`main` mid-run is resolved like any other stale branch: rebase, regenerate the migration
number and Drizzle snapshot with `drizzle-kit generate` (never hand-edit the number or the
journal), re-run `npm run check` to catch a type shape a *different* PR's schema change
just made invalid, re-push. `specs/workflows/AGENT-PIPELINE.md` §3 got the matching table
row. This is fully within an agent's own credential and needs no infrastructure change,
so it shipped in this PR.

**Direction 3** (serialize all schema-touching runs via `MAX_CONCURRENT`) was rejected.
It would cut parallelism repository-wide for a problem that is about *detection*, not
concurrency count — two schema-touching PRs running at once is fine as long as whichever
lands second notices it went `DIRTY` and fixes itself, which direction 2 already covers
for the case an agent is still present to do it. Serializing only helps the case direction
2 doesn't reach (see below), and does so by making every unrelated schema PR wait its turn
regardless of whether a collision would have actually happened.

## What is blocked

**Direction 1** (the "cheapest" option in the issue): the case direction 2 cannot reach is
a PR going `DIRTY` *after* its authoring run has already ended — a later PR merges
underneath it with nobody watching. `auto-merge.yml`'s `update-behind-on-main-push` job
already re-updates any `agent-review`/`autorelease` PR that goes `BEHIND` on every push to
`main` (#793); the fix is to give it the same reflex for `DIRTY` PRs that touch
`shared/schema.ts` or `migrations/` — comment and apply `agent-stuck`, reusing the
existing silent-escalation path from #800/#801 instead of leaving the PR blocked with no
signal.

That change is entirely inside `.github/workflows/auto-merge.yml`. Per
`specs/AGENT-AUTONOMY-POLICY.md` §3 (from #729, most recently applied in #692/#821 and
#819/#823): the agent's PAT is rejected server-side on any change under
`.github/workflows/`, with no `GITHUB_TOKEN` workaround — a hard platform restriction, not
a policy choice. The exact diff is pasted in a PR comment for a human to apply directly.

## To reverse

Delete the §6 / §3 table rows added by this PR and this file. The `auto-merge.yml` diff
was never applied, so there is nothing else to reverse — only a human decision still
pending on the pasted PR comment.
