---
title: "Dependabot auto-merge backlog from strict branch protection"
date: 2026-04-13
severity: P3
status: Action Items Open
trigger: "stakeholder request — automation appears to function but does not deliver the intended outcome (PRs merging without human attention)"
distribution: public
owner: "platform / devops lead"
participants: "platform / devops lead, repo maintainer"
components: "CI/CD pipeline, GitHub branch protection, Dependabot, .github/workflows/dependabot-auto-merge.yml"
incident_state_doc: "N/A — discovered during a routine session resume, no live incident channel"
---

# Postmortem: Dependabot auto-merge backlog from strict branch protection

> **Status:** Action Items Open — reviewed and approved 2026-04-13; tracking issues #472–#476
> **Severity:** P3 (no user-visible impact; recurring developer toil + erodes trust in dependency automation)
> **Distribution:** Public
> **Incident date:** 2026-04-13 07:23 UTC (Dependabot weekly run)
> **Published:** 2026-04-13

---

## Executive Summary

The weekly Dependabot run on Monday 2026-04-13 opened 12 pull requests against `main`. The auto-merge workflow ran successfully on every PR and correctly enabled GitHub auto-merge on the 7 npm patch/minor PRs that match the auto-merge policy. None of those 7 PRs subsequently merged. They are stuck in `BEHIND` (out-of-date with `main`) or `UNKNOWN` mergeable state, because branch protection on `main` requires up-to-date branches (`strict: true`) and Dependabot only rebases one PR at a time. The result is that the developer encounters the entire backlog manually each Monday, defeating the purpose of the auto-merge automation. The single most important preventive action is to switch `main` to a GitHub merge queue, which serializes rebase-and-merge automatically and removes the need for Dependabot to rebase each PR by hand.

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Duration | Recurring weekly since the auto-merge workflow was added; observed acutely on 2026-04-13 |
| Users / requests affected | 0 end users |
| Features / endpoints affected | None in production |
| Error rate during incident | N/A — no production error |

### System Impact

- [ ] API availability degraded
- [ ] Database access affected
- [ ] 3D museum experience impacted
- [ ] Storage / asset retrieval broken
- [x] CI/CD pipeline affected (dependency automation does not complete unattended)
- [ ] Security: credentials or data potentially exposed
- [x] Other: developer toil — recurring weekly manual triage of ~7 PRs that were intended to merge themselves

### Data / Security Impact

- **Data affected:** None.
- **Credentials potentially exposed:** None.
- **User data at risk:** No.

### Revenue / Business Impact

None. Indirect cost is engineering time spent on triage that the automation was designed to eliminate (estimate: ~15–30 min per weekly Dependabot batch).

---

## What Changed Last

| Change | Type | Timestamp (UTC) | Notes |
|--------|------|-----------------|-------|
| Dependabot weekly run opened 12 PRs | dependency | 2026-04-13 07:23–07:26 | Trigger event; not the root cause |
| `dependabot-auto-merge.yml` workflow already present | config | (pre-existing) | Approves + enables auto-merge for npm patch/minor and all GitHub Actions |
| Branch protection `required_status_checks.strict: true` on `main` | config | (pre-existing, set when branch protection was first configured) | Requires every PR to be up-to-date with `main` before merge; this is the system condition that converts each successful merge into a stall for every other open PR |

No deploy or production code change was involved. The "change" was the predictable weekly arrival of a batch of PRs interacting with a long-standing branch-protection setting.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 07:21 | Dependabot opens first PRs (carry-over GitHub Actions bumps from prior runs: `dependabot/fetch-metadata`, `docker/build-push-action`) |
| 07:23–07:26 | Dependabot opens 10 npm PRs in rapid succession (#460–#469) |
| 07:23–07:27 | `Dependabot Auto-Merge` workflow runs once per PR; all 12 runs complete `success`; 7 npm PRs get auto-merge enabled, 3 majors (#464 framer-motion, #466 react, #468 eslint) get a "skipped — major" comment |
| 07:23–07:30 | CI checks (`Lint, Type Check, Test & Build`, security scans) pass on the patch/minor PRs |
| ~07:30 | First eligible PR could merge; in practice some GH Actions PRs do merge (PRs #457, #458, #459 land) |
| ~07:30 onward | Every subsequent PR is now `BEHIND`. Dependabot's rebase loop processes them serially. With 7 npm PRs queued and the next merge re-staling all the others, the queue does not drain |
| 2026-04-13 ~later | Developer resumes session on VPS; finds 10 open Dependabot PRs and asks why automation did not handle them |

---

## Root Causes and Trigger

### What Changed Last (Summary)

No code or deploy change. The trigger was the routine weekly Dependabot batch interacting with a branch-protection rule that does not scale to simultaneous PRs.

### Trigger

Weekly Dependabot run opened 10 npm PRs against `main` at the same time (07:23–07:26 UTC).

### Root Cause Analysis

```
Failure mode 1: 7 npm PRs that are eligible for auto-merge do not merge
  Why? → They are in mergeable state BEHIND (out of date with main).
  Why? → Branch protection on `main` has required_status_checks.strict: true,
         so a PR cannot merge until it has been rebased onto the latest main.
  Why? → When 10 PRs are opened simultaneously, only one can be ahead of main
         at a time. As soon as one merges, the other 9 are BEHIND and need rebase.
         Dependabot rebases serially, one PR at a time, and each rebase re-stales
         the next merge — a queueing collapse.
  System gap: GitHub auto-merge does not include rebase-and-merge orchestration
              under strict branch protection. A merge queue (or relaxed strictness)
              is required to converge a batch under `strict: true`.

Contributing factor A: The Dependabot batch arrives as a large simultaneous burst
                       rather than a steady stream
  Why? → Weekly schedule + only `patch` updates are grouped; minors and majors each
         get their own PR (see .github/dependabot.yml lines 14–17).
  Why? → Group config covers patch only, leaving 6+ separate minor PRs per week.
  System gap: dependabot.yml grouping is too narrow to keep the batch small enough
              to drain under a serial rebase loop.

Contributing factor B: There is no monitoring for "auto-merge enabled but not merged"
  Why? → No alert exists for PRs that have auto-merge set but remain open >24h.
  Why? → The auto-merge workflow's success metric is "workflow run succeeded",
         not "PR actually merged".
  System gap: Outcome is not measured; only the intermediate step is. Per the
              monitoring-failure trigger criterion, this is an alerting gap.

Contributing factor C: dependabot.yml requests a `dependencies` label that does
                       not exist in the repo
  Why? → The label was never created; existing labels are listed via
         `gh label list` and `dependencies` is absent.
  Why? → No CI check validates that labels referenced in dependabot.yml exist.
  System gap: Cosmetic — produces a noisy bot comment on every PR but does not
              block merge. Worth fixing alongside the structural work.
```

### Why Wasn't This Caught Earlier?

- The auto-merge workflow's success signal (workflow `conclusion: success` on every PR) is misleading: it confirms the workflow ran, not that the PR merged. There is no alert tied to the actual merge outcome.
- Earlier weekly batches were small enough to drain (often only 1–3 PRs), so the queueing collapse only becomes visible when the batch size approaches or exceeds the rebase rate.
- Branch protection settings are reviewed rarely; `strict: true` is a sensible default for human-authored PRs and was not re-evaluated when Dependabot automation was added.

---

## Detection

| Field | Value |
|-------|-------|
| Detection method | Manual observation — developer found 10 open PRs on session resume |
| Time from failure start to detection | Hours (next session start) |
| Alert that fired (if any) | None |
| Why wasn't it caught sooner? | No alert on "auto-merge enabled but PR still open after N hours". Workflow-level success masks outcome-level failure. |

---

## Response and Mitigation

### Immediate Mitigation

None applied yet. The 7 stuck PRs are still open as of this draft; no production impact, so triage can proceed deliberately rather than via manual force-merge.

**Was rollback triggered?** Not applicable — no production change.

### Full Resolution

Pending action items below. Short term, the backlog can be drained by manually triggering a Dependabot rebase on each PR in turn (`@dependabot rebase`) and waiting for each to land before the next is rebased. Long term, the structural fix is a merge queue or relaxed strictness for Dependabot PRs.

### What Slowed Recovery

- No tooling to bulk-trigger Dependabot rebases.
- No documented runbook for "Dependabot Monday backlog".
- Auto-merge workflow comments do not surface the BEHIND state; the developer must inspect each PR's mergeable status individually.

---

## Credential and Secret Rotation

N/A — not a security incident.

---

## Lessons Learned

### What Went Well

- The auto-merge workflow's policy logic is correct: 3 majors were correctly held for manual review; 7 patch/minor PRs were correctly approved + enqueued for auto-merge; all 12 workflow runs completed `success` in <90s each.
- Branch protection prevented any out-of-date PR from merging — the very behaviour that caused the backlog also guarantees that nothing dangerous slipped through.
- CI completed cleanly on every Dependabot PR (no flaky failures muddying the diagnosis).

### What Went Poorly

- Automation reports success at the wrong layer: workflow run vs. actual merge outcome.
- Dependabot grouping is too narrow — only patches are grouped, so each minor bump is its own PR, multiplying the batch size.
- No alert exists for stalled auto-merge PRs. The failure is silent and only surfaces when a human notices the queue.
- The `dependencies` label referenced in `dependabot.yml` does not exist, generating a noisy bot comment on every PR. Cosmetic but indicates config drift.

### Where We Got Lucky

- This surfaced as a developer-friction issue, not a security one. If a security patch had been in the stuck queue, the same mechanism would have silently delayed rolling it out — the next time a critical CVE patch arrives via Dependabot, the same backlog would block it.
- The 3 major-version PRs (eslint 9→10, react major, framer-motion 11→12) were correctly held back. If the policy had wrongly auto-merged them, this would have been a code incident, not a process one.

---

## Action Items

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | Enable a GitHub merge queue on `main` (or, if rejected, set `required_status_checks.strict: false` for Dependabot-authored PRs only via a ruleset) so auto-merge can converge a batch without serial rebase. Success criterion: the next weekly Dependabot batch lands all eligible PRs without human intervention. | prevent | P1 | platform / devops lead | [#472](https://github.com/ilv78/Art-World-Hub/issues/472) |
| 2 | Broaden Dependabot grouping in `.github/dependabot.yml` to combine minor + patch into a single weekly PR (and a separate group per ecosystem section). Success criterion: weekly batch produces ≤3 PRs in the typical case. | mitigate | P2 | platform / devops lead | [#473](https://github.com/ilv78/Art-World-Hub/issues/473) |
| 3 | Add an alert/check for "auto-merge enabled on a PR but PR still open >24h". Could be a scheduled GitHub Actions workflow that posts to the repo or comments on the stalled PR. Success criterion: any future stall produces a notification within 24h instead of being discovered by chance. | detect | P2 | platform / devops lead | [#474](https://github.com/ilv78/Art-World-Hub/issues/474) |
| 4 | Either create the `dependencies` label in the repo or remove the `labels: [dependencies]` lines from `.github/dependabot.yml`. Success criterion: no future Dependabot PR carries the "label not found" comment. | repair | P2 | platform / devops lead | [#475](https://github.com/ilv78/Art-World-Hub/issues/475) |
| 5 | Document the "Dependabot Monday" runbook in `specs/workflows/` covering: how the auto-merge workflow decides, how to drain a stalled backlog, when to override and merge a major manually. Success criterion: new contributor can drain a stuck batch using the runbook alone. | document | P2 | platform / devops lead | [#476](https://github.com/ilv78/Art-World-Hub/issues/476) |

---

## Security-Specific Action Items

N/A — not a security incident.

---

## Review Checklist

- [x] No individual names in failure or root-cause sections
- [x] Every impact claim has a number or explicit estimate
- [x] Root cause analysis goes at least 2 levels deep (past the human action, to the system gap)
- [x] Multiple contributing factors documented separately where present
- [x] "What Changed Last" section is complete
- [x] At least one `prevent`-type action item exists (Action Item #1)
- [x] Every action item has priority and owner placeholder
- [x] Timeline is complete and chronological
- [x] "Why wasn't it caught sooner?" is answered
- [x] Rollback usage (or non-usage) is documented (N/A — no production change)
- [x] Glossary covers domain-specific terms
- [ ] Document shared with all incident participants for input — pending developer review

---

## Glossary

| Term | Definition |
|------|------------|
| Dependabot | GitHub's automated dependency-update bot. Opens PRs to bump dependency versions on a schedule defined in `.github/dependabot.yml`. |
| Auto-merge (GitHub feature) | A PR setting that tells GitHub to merge the PR automatically as soon as all required checks pass and the branch is mergeable. Does **not** rebase the branch. |
| `required_status_checks.strict` | Branch-protection setting that requires a PR's branch to be up to date with the base branch before it can merge. When `true`, every merge to base potentially invalidates every other open PR. |
| Merge queue | GitHub feature that serializes merges by maintaining a queue of PRs, rebasing each in turn against the latest base, running checks, and merging when green. Designed to make `strict: true` scale to bursty batches. |
| BEHIND (mergeable state) | GitHub PR state indicating the head branch is behind the base branch; under `strict: true` branch protection, BEHIND PRs cannot merge until rebased. |
| Dependabot grouping | `.github/dependabot.yml` feature that combines multiple version updates into a single PR by configurable rules (e.g. all `patch` updates in one PR). |

---

## Appendix

- Issue tracking this postmortem: [#470](https://github.com/ilv78/Art-World-Hub/issues/470)
- Auto-merge workflow source: [`.github/workflows/dependabot-auto-merge.yml`](../../.github/workflows/dependabot-auto-merge.yml)
- Dependabot config: [`.github/dependabot.yml`](../../.github/dependabot.yml)
- Affected open PRs at draft time: #460, #461, #462, #463, #465, #467, #469 (auto-merge enabled, stuck); #464, #466, #468 (correctly held for manual review as majors)
- Branch protection snapshot (relevant fields):
  - `required_status_checks.strict: true`
  - `required_status_checks.contexts: ["Lint, Type Check, Test & Build"]`
  - `required_pull_request_reviews.required_approving_review_count: 0`
  - `enforce_admins: true`
