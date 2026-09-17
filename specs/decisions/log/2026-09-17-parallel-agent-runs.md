---
date: 2026-09-17
title: Agent dispatches run in parallel, one concurrency group per issue, bounded by MAX_CONCURRENT
issue: 808
category: Process
---

Second half of #808. With the decision log one file per decision (ADR-0010, PR #809), the
only reason to serialise agent runs is gone, so the dispatcher's concurrency group moves
from a single repository-wide `agent-run` to `agent-run-<issue>` — one group per issue,
with sweeps sharing a `sweep` group so two sweeps never race over the same pick.

**What this removes.** The one-deep shared pending slot, which is the mechanism that
cancelled every third label (#788) and made the sweep necessary as a recovery path; and
the wait: three issues labelled together now start together instead of taking ~40
minutes in sequence.

**What bounds it now.** `MAX_RUNS_PER_DAY: 10` bounds the day, as before.
`MAX_CONCURRENT: 3` bounds the moment: the pick step counts other in-progress dispatcher
runs and, at the limit, exits with no issue picked. A labelled issue that bounces keeps
`agent-ready` with no claim, so the sweep picks it up — deferred, never dropped. Three is
a starting number chosen for subscription quota, not measured; raise it on evidence.

**What it does not remove.** `package-lock.json` still conflicts on dependency PRs;
rebase and retry. And when several PRs merge within minutes each merge leaves the others
BEHIND — #793's push job re-syncs them and their checks re-run, once per merge
underneath. That is CI minutes, not human time, and is accepted.

**Ordering.** This must land after #809: agents have to be writing to `log/` before they
run in parallel, or the last sequential runs would still collide on the frozen table.

**To reverse:** set the group back to `agent-run`. One line.
