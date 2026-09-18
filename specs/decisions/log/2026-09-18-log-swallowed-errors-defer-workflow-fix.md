---
date: 2026-09-18
title: Log every swallowed route error; defer the CI/CD migration-masking fix to a human
issue: 692
category: Infrastructure
---

#692 reported two related gaps: ~40 `server/routes.ts` handlers catch and discard the
error before responding 500, so the pino global handler (`server/index.ts`) never sees
them and production incidents leave nothing in the logs; and `ci.yml` /
`deploy-production.yml` run `drizzle-kit migrate` (or `push --force`) with
`|| echo "Warning: ..."`, so a real migration failure exits 0 and the deploy proceeds.

**Route logging: fixed in this PR.** Every `catch (error) { res.status(500)... }` block
in `server/routes.ts` that did not already log now calls `logger.error({ err: error },
"<message>")` first, using the same `{ err }`-only shape already established elsewhere in
the file (§5 of `specs/AGENT-AUTONOMY-POLICY.md` — identifiers and error objects, never
argument values). 54 of 60 `catch (error)` blocks needed it; 6 already logged. Also added
the missing `error instanceof z.ZodError` branch to `PATCH /api/blog/:id` and
`PATCH /api/artworks/:id`, the two handlers the issue named explicitly, so a validation
error returns 400 instead of a masked 500.

**CI/CD migration masking: drafted, then reverted, not shipped.** The fix — dropping the
`|| echo` fallback in three exec steps in `.github/workflows/ci.yml` and
`.github/workflows/deploy-production.yml` — was written and verified (YAML parses, logic
checked against each compose file's `DB_MIGRATION_MODE`). It could not be pushed:
`specs/AGENT-AUTONOMY-POLICY.md` §3 records, from #729, that the agent's PAT is rejected
server-side on *any* change under `.github/workflows/`, edit or new file, with no
`GITHUB_TOKEN` workaround — a platform restriction, not a policy choice. The exact diff is
pasted in a PR comment for a human to apply directly. This run does not request the PAT's
`workflow` scope, since granting it is a credential change (gated list item 3) and
explicitly never the agent's call.

**A second, related deviation from the issue's suggested fix, recorded here so a human
applying the diff has the reasoning too.** The issue suggested moving staging to
migrate-mode. `specs/AGENT-AUTONOMY-POLICY.md` §6 already documents staging's push mode as
a deliberate, standing decision (the original `DB_MIGRATION_MODE=migrate` **production**
decision in `specs/decisions/DECISION-LOG.md`'s frozen table never extended it to staging,
and #543/#513 are the record of why staging stays on push). The drafted fix does not
change that: it removes `|| echo` from all three sites, and fixes staging's exec step —
which ran `drizzle-kit migrate` against a database that docker-entrypoint.sh had already
*pushed* (staging's compose sets no `DB_MIGRATION_MODE`) — to `push --force`, matching what
preview already does correctly for the same reason. That mismatch is why staging's masked
failure was invisible: `migrate` against a push-only database has no migration journal to
work from, so it likely never did anything, silently, every deploy. Moving staging to real
migrate-mode is the larger, separate change #543 already owns; this PR does not reopen it.

**To reverse:** delete the added `logger.error` calls and the two `ZodError` branches
(low cost, no behavioral dependency). The CI/CD diff was never applied, so there is
nothing to reverse there — only a human decision still pending on the pasted comment.
