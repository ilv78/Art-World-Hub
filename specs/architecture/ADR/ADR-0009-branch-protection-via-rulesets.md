# ADR-0009: Branch protection on `main` via Repository Ruleset (not classic branch protection)

**Status:** Superseded — 2026-04-13
**Date:** 2026-04-13
**Decision:** Migrate `main` from GitHub classic branch protection to a Repository Ruleset, so that the GitHub merge queue can be enabled.

> ## Superseded notice (2026-04-13)
>
> This decision was abandoned the same day it was made, after Stage 1 (creating the parallel ruleset) succeeded but Stage 2 (adding the `merge_queue` rule) failed at every path tried:
>
> - `gh api PUT /repos/.../rulesets/14998880` with the `merge_queue` rule rejected with `Validation Failed: Invalid rule 'merge_queue': ` (no further detail). Tried with all 7 documented parameters; tried in isolation in a fresh ruleset with `enforcement: disabled`; same error every time.
> - The classic branch-protection UI on this repo does not show a "Require merge queue" checkbox.
> - The Repository Rulesets UI on this repo does not show an "Add rule" button — rules can only be edited via the form fields visible at ruleset-creation time.
>
> Conclusion: GitHub does not expose merge queue for **user-owned (non-organization) repositories** through any path (REST API, classic branch-protection UI, or rulesets UI), regardless of repo visibility (this repo is public). Public docs imply availability on Free for public repos, but the API and UI do not back this up for personal accounts.
>
> **Pivot:** action item [#473](https://github.com/ilv78/Art-World-Hub/issues/473) — broaden Dependabot grouping in `.github/dependabot.yml` to combine npm minor + patch into a single weekly PR per ecosystem. Reduces typical batch from ~10 PRs to ~2–3, which the existing serial-rebase loop drains naturally without needing a queue. Doesn't structurally fix the cascade for very large bursts (e.g. major security fanout), but is the only practical option until merge queue becomes available for user-owned repos or the repo moves into an organization.
>
> **Cleanup applied alongside this supersede:**
>
> - Ruleset `main-protection` (id `14998880`) deleted — it duplicated classic protection without adding value. Classic branch protection on `main` is the sole protection again.
> - `merge_group` trigger in `.github/workflows/ci.yml` (PR [#477](https://github.com/ilv78/Art-World-Hub/pull/477)) **kept**: harmless no-op without merge queue, and saves a step if merge queue ever becomes available.
> - Tracking issue [#472](https://github.com/ilv78/Art-World-Hub/issues/472) closed; postmortem action item shifts to [#473](https://github.com/ilv78/Art-World-Hub/issues/473).
>
> The ADR is kept (rather than deleted) as the record of what was attempted and why, so a future contributor doesn't repeat the dead-end discovery.

## Context

Postmortem `docs/postmortems/2026-04-13-dependabot-auto-merge-backlog.md` (issue [#470](https://github.com/ilv78/Art-World-Hub/issues/470)) documented a recurring weekly stall where 7 of 10 Dependabot PRs that the auto-merge workflow had correctly approved + enqueued never actually merged. Root cause: branch protection on `main` had `required_status_checks.strict: true` (require up-to-date branch). When 10 PRs were opened simultaneously, only one could be ahead of `main` at a time; each merge re-staled the other 9; Dependabot rebases serially and the queue collapsed.

The structural fix is GitHub's merge queue, which serializes rebase + check + merge automatically and is designed for exactly this case (action item [#472](https://github.com/ilv78/Art-World-Hub/issues/472)).

The blocker discovered during implementation: for **user-owned (non-organization) public repositories**, GitHub does not expose the "Require merge queue" checkbox in the classic branch-protection UI or in the classic branch-protection REST API (`/repos/{owner}/{repo}/branches/{branch}/protection`). Merge queue is only configurable via the newer Repository Rulesets system.

## Decision

Migrate the `main` branch protection from classic to a Repository Ruleset, in four reversible stages:

1. **Stage 1** — Create a ruleset on `main` that mirrors the existing classic protection (require PR, required status checks with `strict`, prevent deletion, prevent force push). Both classic + ruleset run in parallel; most-restrictive wins. Verify normal PR flow still works.
2. **Stage 2** — Add the `merge_queue` rule to the ruleset. Verify a test PR flows through the queue.
3. **Stage 3** — Drain the 7 stuck Dependabot PRs by triggering `@dependabot rebase` on each in turn; the queue picks them up and lands them serially.
4. **Stage 4** — Delete the classic branch protection. The ruleset becomes the sole protection.

The ruleset is named `main-protection`, id `14998880`, and contains:

| Rule | Mirrors classic setting |
|------|--------------------------|
| `pull_request` (0 approvals required) | `required_pull_request_reviews.required_approving_review_count: 0` |
| `required_status_checks` (`strict: true`, context = `Lint, Type Check, Test & Build`) | identical |
| `deletion` | `allow_deletions: false` |
| `non_fast_forward` | `allow_force_pushes: false` |
| `merge_queue` (squash, ALLGREEN, group 1–5, wait 5min) | new — not previously possible |
| `bypass_actors: []` | `enforce_admins: true` |

The merge queue requires the required status check to also run on `merge_group` events. `.github/workflows/ci.yml` was updated in PR [#477](https://github.com/ilv78/Art-World-Hub/pull/477) to add the `merge_group` trigger before any branch-protection changes were made.

## Alternatives Considered

1. **Stay on classic branch protection, skip merge queue.** Pivot to action item [#473](https://github.com/ilv78/Art-World-Hub/issues/473) (broaden Dependabot grouping) instead — combine npm minor + patch into one PR per ecosystem per week, reducing the typical batch from ~10 PRs to ~2–3, which the serial-rebase loop drains naturally without a queue. **Rejected:** doesn't structurally fix the cascade. A future burst of 10+ PRs (major security fanout, manual batch) would still backlog. Worth doing in addition (see [#473](https://github.com/ilv78/Art-World-Hub/issues/473)), but not as a substitute.
2. **Run classic branch protection and ruleset permanently in parallel.** **Rejected:** confusing, two sources of truth for "what protects `main`". Stage 4 deletes classic specifically to avoid this.
3. **Move to a GitHub organization** (which exposes merge queue in classic branch protection UI). **Rejected:** larger structural change for a single-developer project; rulesets achieve the same outcome without an org migration.

## Consequences

- **Source of truth for branch protection moves out of the repository.** The ruleset config lives in GitHub (queryable via `gh api /repos/.../rulesets/14998880`), not in a file under version control. This ADR + the DECISION-LOG row are the in-repo record of intent. If the ruleset config drifts, there is no automatic detection.
- **Auto-merge workflow unchanged.** `.github/workflows/dependabot-auto-merge.yml` continues to use `gh pr merge --auto --squash`. Under merge queue, `--auto` adds the PR to the queue instead of merging directly. No code change required.
- **Build runs once per queue group, not per PR.** Under `ALLGREEN` grouping with `max_entries_to_build: 5`, GitHub combines up to 5 PRs into a single ephemeral `gh-readonly-queue/main/...` branch and runs the required check once against the combined commit. Faster CI usage at the cost of "one bad PR fails the whole group" behaviour.
- **Deploy / staging jobs in `ci.yml` are gated on `event_name == 'push'`** and will not fire on `merge_group` events — verified before the trigger was added.
- **Rollback path is fast.** Disable the `merge_queue` rule in the ruleset (or set `enforcement: disabled` on the whole ruleset). Re-applying classic branch protection from the JSON we have on file restores prior behaviour.
- **`current_user_can_bypass: never`** — admin bypass is disabled, matching the prior `enforce_admins: true` behaviour. Direct push to `main` remains impossible for everyone including the repo owner.

## References

- Postmortem: `docs/postmortems/2026-04-13-dependabot-auto-merge-backlog.md`
- Tracking issue: [#472](https://github.com/ilv78/Art-World-Hub/issues/472)
- ci.yml `merge_group` trigger: PR [#477](https://github.com/ilv78/Art-World-Hub/pull/477)
- Ruleset URL: https://github.com/ilv78/Art-World-Hub/rules/14998880
- GitHub docs: [About merge queues](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue), [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
