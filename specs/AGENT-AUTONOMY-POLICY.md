# Agent Autonomy Policy

**Status:** Active
**Last Updated:** 2026-09-11
**Issue:** [#744](https://github.com/ilv78/Art-World-Hub/issues/744)

---

## 0. What this document is for

Standing answers to the questions agents would otherwise ask the developer.

The developer's time is the scarcest resource in this project. Every question forces them to page in context they did not choose, learn a problem they were not working on, and reply. **An escalation is a defect in this document**, not a safety feature.

So: before asking anything, look here. If the answer is here, act on it. If it is not here, follow §2 — decide, act, and write the new rule back into this file in the same PR, so the question is never asked twice.

> **Provenance matters.** Every rule below names the issue it came from. A rule with no provenance is someone's preference; a rule with provenance is a lesson that cost something. When a rule seems wrong, read its issue before overriding it.

---

## 1. The gated list — the only things that need a human

Work is gated by **what it costs to undo**, not by how sensitive it looks. Exactly five things require a human decision. Everything not on this list proceeds autonomously.

1. **Destructive or irreversible schema and data operations** — dropping or renaming a column or table, data backfills, deletions. *Additive migrations are autonomous.*
   Why: `rollback-production.yml` restores the **image**, not the database. A bad migration is an incident with a restore drill, not an undo.
2. **Production promotion.** Staging is autonomous; production is the developer's call.
3. **Secrets and credentials** — creating, rotating, moving, or changing who can read them.
4. **Anything that spends money or reaches a third party** — a new paid service, an external API with a bill, anything that emails real users.
5. **Deleting anything not in git** — volumes, backups, remote state, uploaded files.

Explicitly **not** gated, because all of it is revertible: auth and authorization code, order and payment *code paths*, PII-adjacent logging, nginx config, security suppressions, CI changes, refactors, features, dependency bumps.

### Enforcement

`.github/workflows/gated-paths.yml` runs `script/gated-paths.mjs` on every PR. A PR
carrying a gated change fails until the developer applies the **`human-approved`**
label. **An agent must never apply that label to its own PR** — the check reads the
GitHub timeline to see who applied it and rejects a bot.

**What the check actually covers.** Only items **1** and **3** are visible in a diff:

| Item | Enforced how |
|---|---|
| 1 · destructive schema/data | **Mechanically.** Migration SQL is split into statements and matched on the leading keyword — `DROP TABLE`, `TRUNCATE`, `DROP COLUMN`, `RENAME`, `ALTER COLUMN … SET NOT NULL`, and statements beginning `UPDATE` / `DELETE FROM` / `INSERT INTO`. Matching leading keywords rather than searching the text is essential: every additive Drizzle migration contains `ON DELETE no action ON UPDATE no action` inside its foreign keys. |
| 3 · secrets | **Mechanically**, by path shape (`.env` but not `.env.example`, `secrets/`, `*.pem`, `*.key`, SSH keys). |
| 2 · production promotion | Not a PR. Gated by `deploy-production.yml` being `workflow_dispatch`. |
| 4 · money / third parties | **Not inferable from a diff.** Stays a policy rule, enforced by the reviewer agent and the PR's own declaration. |
| 5 · deleting things not in git | **Not in the diff by definition.** A runtime rule. |

The check is a **required status check** on `main`, so a failing gate blocks the
merge rather than merely reporting. It is required *because* it was proven stable
first — a mandatory gate that can crash blocks every merge in the repository, which
costs the developer far more than it saves.

The check also **guards itself**: `script/gated-paths.mjs` and its workflow are
gated paths. Without that, an agent could widen its own authority in a single PR,
which would make every other rule here unenforceable.

**This file is deliberately not guarded.** §11's write-back rule requires editing it
every time an escalation is answered; charging a label for each of those is exactly
the cost this policy exists to remove. Enforcement lives in the detector's list, not
in this prose — editing the document cannot widen what CI blocks.

**Known limit, stated rather than papered over:** an agent acting with the
developer's own credentials is indistinguishable from the developer. The check
rejects *bot* accounts, not impersonation.

---

## 2. The prime directive: default and document

When this policy does not cover a decision:

1. **Choose the most reversible option.** Not the best one — the one that is cheapest to undo if it is wrong.
2. **Do it.** Do not wait.
3. **Record it** in `specs/decisions/DECISION-LOG.md` and in the PR body, with the reasoning and what it would take to reverse.
4. **Write the rule back into this file** in the same PR, phrased so the next agent does not re-derive it.

A revert costs minutes. A blocking question costs an afternoon. The asymmetry is the whole design.

**You may only escalate after genuinely trying to answer the question yourself** — from the code, `specs/`, git history, the decision log, and past issues. "I could not find it" is not grounds. "This is unrecoverable if I get it wrong" is.

---

## 3. Git and delivery

| Rule | Why |
|---|---|
| **Never push to `main`.** Feature branch (`feature/issue-N-slug`) + PR, always. | Standing developer rule. `main` auto-deploys to staging. |
| Squash-merge, delete the branch. | Keeps history one-commit-per-issue and readable. |
| **Never force-push** a branch someone else may hold, and never `main`. Use `--force-with-lease` where a force is genuinely needed. | |
| Rebase onto `main` before opening a PR, and whenever a PR goes stale. | Three PRs sat red for weeks in #741 purely because their branches predated fixes on `main`. |
| A Dependabot branch edited by a human cannot be rebased by Dependabot. Use `@dependabot recreate` once you have confirmed the edit carried nothing of value. | #628 — the "edit" was a stale merge of `main`; recreate regenerated the lockfile cleanly against current `main`. |
| End commits with the attribution line given in the session's instructions; end PR bodies with the generated-with line. | |

---

## 4. Security and dependencies

**Escalation order for any vulnerability finding. Work down it; stop at the first that applies.**

1. **Upgrade it** — lockfile bump, npm `override`, or a Dockerfile `--only-upgrade`. This is how `libgnutls30` was actually fixed in #710, after three cycles of suppressing it.
2. **Declare the path vendored** — add a glob to `.github/trivy-vendored-paths.json` when the vulnerable file is inside software we cannot version. One pattern covers every future disclosure against that path, with no expiry to forget. (#728)
3. **Suppress it** — only for a finding in code we control that is judged non-exploitable. Requires `paths:`, a `statement`, and an `expired_at`. Expect to justify it. (#739 pruned all 50 accumulated suppressions to zero; the file should stay near-empty.)

| Rule | Why |
|---|---|
| **OS packages always block**, whatever their path. | They ship with the base image, but a Dockerfile line still fixes them. Treating them as vendored would mask a real, fixable CRITICAL. (#728) |
| **Type packages track the runtime, never lead it.** `@types/node`'s major follows the base image's major and moves with it. | 26.x types against a `node:25` image describe APIs the container does not have — code type-checks and fails at run time, and `tsc` cannot catch it because the types *are* the contract. (#741) |
| **Read the whole scan output before fixing anything.** Count `Total: N` first. | Batch CVE disclosures ship 2–4 related findings; fixing the first one and re-running wastes a cycle. |
| Never `npm audit fix --force`. | Pulls unreviewed majors. `@hono/node-server` 2.x is MCP-incompatible and would land silently. (#722) |
| A dependency whose *stated* reason for suppression is "upstream will fix it" must be re-verified against the current upstream, not assumed. | #710: the entries pointed at a base-image rebuild that had not happened and was not going to. |

---

## 5. Logging and observability

| Rule | Why |
|---|---|
| **Log identifiers, never values.** No argument values, no buyer contact details, no order contents. | `/api/admin/logs` and the `get_logs` MCP tool both surface `app.log` to admins, so anything logged is readable back through the app. Logging `create_order` arguments would hand out buyer PII. (#738) |
| **Every authenticated, mutating surface gets an audit line** — caller, session, target id, outcome, duration. Denials at `warn` with the reason. | Denials are the signal that a cross-tenant attempt happened at all. (#738) |
| **Any new steady log writer must be bounded** in the same change that adds it. | An audit trail must not become the reason a volume fills. (#738) |
| Use `pino.multistream`, **never `pino.transport()`**. | Transports spawn worker threads that cannot resolve modules inside the single-file CJS bundle produced by `script/build.ts`. This has now shaped two designs. (#738) |
| Instrument at the registration boundary, not per handler. | A handler added later is then covered by construction rather than by someone remembering. (#738) |
| Log files are `app.1.log`, `app.2.log`, … — read them via `logReadPaths()`, never by opening `logs/app.log`. | `pino-roll` inserts the number before the extension. Matching the wrong shape finds nothing and silently empties the admin log viewer. (#738) |

---

## 6. Database and migrations

| Rule | Why |
|---|---|
| Additive migrations are autonomous. **Destructive ones are gated** (§1.1). | |
| **Staging runs Drizzle in `push` mode and does not execute migration SQL bodies.** A migration containing a data backfill (`UPDATE …`) runs in production but leaves staging with unmigrated data. Apply such backfills to staging manually, or the staging verification is false. | Per the `DB_MIGRATION_MODE` decision; bit #513's migration 0007. |
| Never add a `NOT NULL UNIQUE` column to a populated table without backfilling first. | The #543 failure shape; it is why the local dev DB is currently broken. |
| **The local dev database lags `shared/schema.ts` deliberately.** `/api/artists` and `/api/artworks` return 500 locally. Do not chase those; do not "fix" it as a side quest. | Known and accepted. Production and staging are unaffected. |
| Schema changes update `specs/architecture/DATA-MODEL.md` in the same PR. | |

---

## 7. Deployment and release

| Rule | Why |
|---|---|
| **Never `gh release create`.** Trigger `release.yml` via `gh workflow run`. | |
| **Never deploy production manually.** Trigger `deploy-production.yml`. | |
| Production promotion is gated (§1.2). **Promote often, in small batches.** | A gate over forty accumulated changes is theatre — nobody can meaningfully approve it. Frequency is what keeps the gate real. (#744) |
| Before any VPS operation needing `sudo` or touching nginx/systemd, read `specs/workflows/DEPLOYMENT.md` §5 and prefer the documented helpers. | They are non-interactive and include backup, validate, reload, and auto-rollback on `nginx -t` failure. The allowlist is narrow; anything else prompts for a password an agent cannot supply. (#550) |

---

## 8. Documentation

Documentation is part of the change, never a follow-up.

- New or changed feature → `specs/features/<name>/SPEC.md` (+ `CHANGELOG.md` where one exists)
- Schema change → `specs/architecture/DATA-MODEL.md`
- Architectural, infrastructure, security, or process decision → a row in `specs/decisions/DECISION-LOG.md`, **in the same PR**
- A decision with lasting structure → `specs/architecture/ADR/ADR-XXXX.md`
- Workflow change → the relevant `specs/workflows/` doc
- A decision that answers a question an agent would otherwise ask → **a rule in this file**

The Documentation Agent enforces the first four on every PR.

---

## 9. What "done" means

Green CI is **not** evidence that the change works. Two failure modes from a single day:

- **#628** — the pipeline was entirely green and verified nothing, because the plugin under test only loads when `ANALYZE` is set and no CI job sets it.
- **#738** — the code read correctly and the tests passed; the rotating log files were named `app.1.log` while the reader looked for `app.log.1`. Caught by running it, not by reading it.

Therefore:

1. **Every PR states what CI does not cover**, and what was verified by hand instead. A PR that cannot answer this is not finished.
2. **Verify on the deployed instance** wherever the change's effect is observable there, and post the evidence to the issue — the staging log lines that closed #738 are the pattern.
3. Where a local run is the only way to exercise something (an `ANALYZE`-only plugin, a rotation policy), run it locally and say so.
4. **"Done" means every pipeline triggered by the merge has completed** — CI/CD, Security, Documentation Agent — not that the merge landed.
5. Before handing anything back to the developer, confirm the server starts cleanly.

---

## 10. When you must escalate

Only for the gated list (§1), or for something genuinely unrecoverable if wrong. When you do:

1. **Do all the work that does not depend on the answer first.** Never hold a whole issue hostage to one question.
2. Post the question **once**, on the issue, with: the options, your recommendation, and **what you will do if there is no answer** — usually the most reversible default, after a stated interval.
3. Label the issue `agent-stuck` only if you are genuinely blocked. A stuck issue waits silently; it does not page anyone.
4. **Batch questions.** One comment with three decisions costs the developer far less than three comments.
5. When the answer arrives, **write it into this file in the same PR.** An escalation that does not produce a rule has been wasted.

---

## 11. Keeping this file honest

- Every answered escalation becomes a rule here. No exceptions — that is the mechanism by which the escalation rate decays.
- A rule that turns out to be wrong is **deleted**, not hedged. Record the deletion in the decision log.
- If escalations are not decreasing over time, this file is the thing that is broken — not the agents, and not the developer.

---

## Revision Log

| Date | Change |
|---|---|
| 2026-09-11 | `Gated Path Review` made a required status check on `main`; self-guard narrowed to the detector and its workflow — guarding this file fought §11's write-back rule and bought no enforcement. ([#744](https://github.com/ilv78/Art-World-Hub/issues/744)) |
| 2026-09-11 | Added §1 Enforcement: `gated-paths.yml` + `script/gated-paths.mjs` now enforce items 1 and 3 mechanically, self-guard the gate, and state plainly which items a diff cannot reveal. ([#744](https://github.com/ilv78/Art-World-Hub/issues/744)) |
| 2026-09-11 | Created. Harvested from rules already scattered across `CLAUDE.md`, `specs/SECURITY_AGENT.md` §6, the `.trivyignore.yaml` header, `specs/decisions/DECISION-LOG.md`, and the developer preferences held in session memory. Sources: #513, #543, #550, #710, #722, #728, #738, #739, #741. ([#744](https://github.com/ilv78/Art-World-Hub/issues/744)) |
