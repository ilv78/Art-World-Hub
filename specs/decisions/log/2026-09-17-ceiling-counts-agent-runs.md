---
date: 2026-09-17
title: The daily dispatch ceiling counts runs in which the agent actually ran, read from each run's jobs
issue: 788
category: Process
---

Third attempt at the same number, each time because the count measured something
other than what the ceiling is for. `MAX_RUNS_PER_DAY` exists to bound spend — the agent
running is what costs — so the count must be runs in which `Work the issue` executed.

**First version** used the workflow's `total_count`, which counts every invocation. The
dispatcher is invoked on every `issues: labeled` event in the repository, so filing three
issues consumed the budget: 13/10 on 2026-09-14 with exactly one real run (#768).

**Second version** filtered by conclusion, excluding `skipped` and `cancelled`. Sweeps that
pick nothing end `success` — the pick step ran and exited cleanly — so every no-op sweep,
cron or forced, counted as an agent run. On 2026-09-17 it refused #507's re-dispatch at
"11/10" when seven runs had reached the agent; the other four were empty sweeps and the
refusal itself.

**This version** reads each non-skipped, non-cancelled run's jobs and counts it only if its
`Work the issue` step has a conclusion other than `skipped`/absent. One API call per run,
bounded by the ceiling this step enforces (at most ~MAX_RUNS_PER_DAY + sweeps per day).
Replayed against 2026-09-17's real runs before shipping: 7, where the previous filter said
11 and the first would have said 25.

**What it still does not do:** distinguish a run that reached the agent and died at turn 1
on a rate limit (#812) from a full run. Both cost a run of the budget; that is acceptable
until #812 makes rate-limited runs defer instead of fail.

**Lesson, stated once:** a bound is only as honest as the thing it counts. "Runs" was never
the quantity; "the agent ran" was. Two proxies for it were each wrong in a direction that
only showed under load.
