---
date: 2026-09-28
title: Remove the redundant external drizzle-kit push from staging/preview deploy steps
issue: 692
category: Infrastructure
---

#692's fix (PR #839, merged earlier today) corrected staging's deploy step to run
`drizzle-kit push --force` instead of the wrong `drizzle-kit migrate`, and removed
the `|| echo` masking so a real failure fails the deploy. Both changes were
individually correct, but together they left a second `push --force` running
*outside* `docker-entrypoint.sh`, right after `docker compose up -d`.

That is worse than redundant. `docker-entrypoint.sh` already runs the same push on
every container start and, since #833/#834, greps its own output for drizzle-kit's
known failure mode — an interactive "truncate table?" prompt that exits 0 with no
TTY to answer it, silently leaving the schema stale (exactly what broke staging
logins for five days, 2026-09-18 to 2026-09-23). The CI step's plain
`docker compose exec` had no equivalent detection: removing `|| echo` only catches
a *non-zero* exit, not drizzle-kit's silent zero-exit abort. A schema change could
fail at this second push, on an already-running and already-healthy container, and
this step would still report green.

Fix: delete the external push step for both staging and preview. The entrypoint is
the only place this is currently safe to run, and the existing health-check loop
already fails the deploy if the entrypoint's protected push caused the container to
exit. Production's `drizzle-kit migrate` exec step is left as-is — `migrate` has no
equivalent silent-abort mode, so removing its `|| echo` mask (also part of #839) is
sufficient there without the same follow-up.

Found by reading `#833`'s own fix while resolving a merge conflict on an unrelated
PR (#825) that touched the same file — not from monitoring or a report. Recorded
per the standing rule: a correction to a matching/safety rule should be checked
against every consumer of the same signal, not just the one where it was noticed
(same lesson as #768/#773/#785 for a different rule).
