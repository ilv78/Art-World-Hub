---
date: 2026-09-23
title: Staging schema push fails the container start on error; staging deploy gains a DB smoke test
issue: 833
category: Infrastructure
---

`drizzle-kit push --force` exits 0 when it aborts, whether on an interactive prompt it can't answer without a TTY or on a failed statement. An abort applies **none** of the pending changes. From #817 (2026-09-18) onward, `curator_galleries_slug_unique` on a 3-row table triggered a "truncate?" prompt on every staging start. Staging ran on a stale schema for five days, and once #831 added `users.approval_status`, every login returned 500. `set -e` in the entrypoint didn't help, and the deploy smoke tests (health, version, logging) never touch the database, so CI stayed green and the #831 deploy comment reported success.

**Chosen:** `docker-entrypoint.sh` captures the push output and exits 1 on a non-zero exit, a line starting `Error:`/`error:`, or `Interactive prompts require a TTY`. The staging deploy gains `Smoke test — database schema`: three DB-backed GETs must return 200, and a login for a non-existent account must return 401. A 500 there means a broken `users` query.

**Trade-off accepted:** the next prompt-triggering schema change leaves staging *down* (container fails, deploy red) rather than *up on a stale schema*. Down and loud is recovered in minutes; up and silent cost five days and a false "verified on staging" for #831.

**Rejected:** piping `yes` into `drizzle-kit push` would answer "truncate table" with yes, destroying staging data. Matching only the TTY message would miss the failed-statement shape, which surfaced during this same fix: `IDX_orders_artwork_active` from 0014 had never been built on staging because of duplicate test orders.

**Reversal:** revert the entrypoint block and the smoke step. The structural replacement is migrate mode on staging (#543), after which the push-mode guard is dead code and can go.
