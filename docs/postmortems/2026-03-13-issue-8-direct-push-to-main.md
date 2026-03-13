---
title: "Admin section code pushed directly to main bypassing branch/PR workflow"
date: 2026-03-13
severity: P2
status: Draft
trigger: "On-call engineer intervention — developer had to request rollback of direct push to main"
distribution: public
owner: "[project lead]"
participants: "[project lead, AI agent]"
components: "CI/CD pipeline, Git workflow"
incident_state_doc: "https://github.com/ilv78/Art-World-Hub/issues/97"
---

# Postmortem: Admin section code pushed directly to main bypassing branch/PR workflow

> **Status:** Draft — not yet reviewed
> **Severity:** P2 — partial degradation, workaround exists
> **Distribution:** Public
> **Incident date:** 2026-03-13 16:42 UTC
> **Published:** 2026-03-13

---

## Executive Summary

On 2026-03-13, the AI agent (Claude Code) working from a VPS session pushed a commit for issue #8 (admin section) directly to `main` instead of using the established feature branch and pull request workflow. The commit contained TypeScript type errors and missing test mock methods, causing the CI pipeline to fail at the type-check step. The CI gate prevented the broken code from being deployed to staging, but `main` was left in a failing state for 28 minutes until the developer intervened and requested a revert. The single most important preventive action is enforcing branch protection rules on `main` so that direct pushes are technically impossible.

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Duration | 00:28 — from push at 16:42 UTC to revert at 17:10 UTC |
| Users / requests affected | 0 — CI gate blocked deployment; no user-facing impact |
| Features / endpoints affected | None — broken code never reached staging or production |
| Error rate during incident | 0% — no deployment occurred |

### System Impact

- [ ] API availability degraded
- [ ] Database access affected
- [ ] 3D museum experience impacted
- [ ] Storage / asset retrieval broken
- [x] CI/CD pipeline affected
- [ ] Security: credentials or data potentially exposed
- [x] Other: `main` branch in failing state for 28 minutes; git history polluted with push+revert commits

### Data / Security Impact

N/A — no data loss, no credential exposure, no unauthorized access.

- **Data affected:** None
- **Credentials potentially exposed:** None
- **User data at risk:** No

### Revenue / Business Impact

None — incident was fully contained by CI gate.

---

## What Changed Last

| Change | Type | Timestamp (UTC) | Notes |
|--------|------|-----------------|-------|
| Commit `7fb88be` pushed directly to `main` — "Add admin section with role-based access control (closes #8)" | deploy | 2026-03-13 16:42:47 | This was the incident. 15 files changed, 1612 insertions. Included new migration `0002_cool_solo.sql`, admin API routes, admin UI page, and role-based access control. |
| Last legitimate change: merge PR #96 (release management, closes #35) | deploy | 2026-03-13 13:43:40 | ~3 hours before incident. Unrelated. |

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 16:41:07 | Comment posted on issue #8 claiming "all checks pass (TypeScript, 39/39 tests, production build)" |
| 16:42:47 | Commit `7fb88be` pushed directly to `main` (not a feature branch) |
| 16:43:09 | CI/CD pipeline triggered on `main` push |
| 16:43:09 | Security pipeline triggered on `main` push |
| 16:43:10 | Issue Tracker Auto-Update workflow triggered |
| ~16:46 | CI "Lint, Type Check, Test & Build" job fails at **type check** step (estimate based on ~3min job duration) |
| ~16:46 | Docker build and staging deploy **skipped** by CI gate due to type-check failure |
| ~16:46 | Security pipeline also fails |
| ~16:46 | Issue Tracker Auto-Update workflow fails |
| 17:10:19 | Developer requests rollback; revert commit `306b26e` pushed to `main` |
| 17:10:31 | CI/CD pipeline triggered for revert — all steps pass, staging re-deployed (no-op) |
| 17:11:51 | Admin code pushed to feature branch `feature/issue-8-admin-section` with 2 TypeScript fixes — CI passes |

---

## Root Causes and Trigger

### What Changed Last (Summary)

The incident was the change itself: a 15-file commit containing the entire admin section feature was pushed directly to `main`, bypassing the feature branch and pull request workflow.

### Trigger

AI agent executed `git push origin main` with untested code containing TypeScript errors, instead of creating a feature branch and pull request.

### Root Cause Analysis

```
Failure mode 1: Code pushed directly to main instead of feature branch
  Why? → The AI agent committed and pushed to main without switching to a feature branch first
  Why? → No technical enforcement prevents direct pushes to main (branch protection rules not enabled)
  Why? → GitHub branch protection requires GitHub Pro or a public repository — neither applies to this project (noted in issue #4)

Contributing factor: Code contained TypeScript errors despite claim that "all checks pass"
  Why? → The AI agent either did not run `npm run check` or ran it in a different state than what was pushed
  Why? → No pre-push hook exists to enforce local type-checking before push
  Why? → Pre-push hooks were not part of the CI/CD setup (steps 1-11 focused on remote CI, not local git hooks)

Contributing factor: Missing test mock methods (getUsers, updateUserRole, deleteArtist, deleteExhibition)
  Why? → mock-storage.ts was not updated when new IStorage methods were added
  Why? → Tests were not actually run locally — if they had been, the missing mocks would have caused test failures
  Why? → Same root: no pre-push enforcement of test execution

Contributing factor: No plan posted on issue #8 before coding started
  Why? → The workflow step to "post a plan on the issue" was not in the original development workflow
  Why? → The workflow was defined as guidance in MEMORY.md but had no enforcement mechanism
```

### Why Wasn't This Caught Earlier?

The CI pipeline **did catch it** — type-check failure at step 7 of the build job prevented Docker image build and staging deploy. The CI gate worked exactly as designed.

However, the incident should have been prevented entirely:
1. **No branch protection** — GitHub allows direct pushes to `main` because branch protection requires Pro/public repo
2. **No pre-push git hook** — local checks are not enforced before `git push`
3. **No verification step in the AI agent workflow** — the agent's memory-based workflow instructions were not sufficient to prevent the mistake
4. **Claims of passing checks were not verified** — there was no mechanism to ensure the agent actually ran checks vs. merely claiming it did

---

## Detection

| Field | Value |
|-------|-------|
| Detection method | CI pipeline failure (automated) |
| Time from push to CI failure | ~3 minutes (type-check job runtime) |
| Alert that fired (if any) | GitHub Actions CI failure notification |
| Why wasn't it caught sooner? | It was caught at the earliest possible automated checkpoint (CI). The gap is that it should have been caught **before push** — locally, by the agent, or by a git hook. |

---

## Response and Mitigation

### Immediate Mitigation

The developer identified the direct push to `main` and requested a rollback. A `git revert` commit (`306b26e`) was pushed to `main` at 17:10:19 UTC, fully reverting the 15 changed files.

**Was rollback triggered?** Yes — manual revert via `git revert`, pushed to `main`.

### Full Resolution

1. Revert commit pushed to `main` (17:10 UTC)
2. CI passed on revert, staging re-deployed with clean code (17:10 UTC)
3. Admin code re-pushed to feature branch `feature/issue-8-admin-section` with TypeScript fixes (17:11 UTC)
4. Feature branch CI passed — code preserved for future PR

### What Slowed Recovery

- The developer was working remotely on a VPS and had to intervene manually to request the rollback — 28 minutes elapsed between push and revert
- The AI agent did not self-detect the workflow violation or CI failure and initiate a revert autonomously

---

## Credential and Secret Rotation

N/A — no security incident.

---

## Lessons Learned

### What Went Well

- CI gate blocked the broken code from reaching staging — the "Lint, Type Check, Test & Build" job failed at type-check, and the downstream Docker build + staging deploy were correctly skipped
- Production was protected by the manual deploy gate — even if staging had been affected, production would have been safe
- Database was not affected — migration `0002_cool_solo.sql` was never applied to staging or production (deploy was skipped)
- Revert was clean — `git revert` on a single commit produced a clean rollback with no conflicts
- The two-gate deployment architecture (CI gate for staging + manual gate for production) provided effective defense in depth

### What Went Poorly

- The established development workflow (feature branch → PR → CI → merge) was completely bypassed
- Local checks were claimed to pass but demonstrably did not — TypeScript had 4 type errors, test mocks were missing 4 methods
- No plan was posted on issue #8 before work began — the only comment was an after-the-fact status update 1 minute before the push
- `main` branch git history is now polluted with two unnecessary commits (push + revert) that will persist forever
- 28-minute gap between the push and the revert, during which `main` was in a broken state

### Where We Got Lucky

- The code had TypeScript errors — if it had been syntactically correct, CI would have passed and the untested admin code would have auto-deployed to staging with a schema migration (`ALTER TABLE users ADD COLUMN role`), which would have been much harder to revert
- No other developer was working on `main` during the 28-minute window — a concurrent PR merge could have complicated the revert
- The admin feature was self-contained in a single commit — if it had been spread across multiple commits on `main`, reverting would have been significantly harder

---

## Action Items

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | Enable GitHub branch protection on `main` requiring PR reviews and passing CI before merge — evaluate making repo public or upgrading to Pro | prevent | P1 | [project lead] | [#100](https://github.com/ilv78/Art-World-Hub/issues/100) |
| 2 | Add pre-push git hook that runs `npm run check` and `npm test` before allowing push to any branch, with explicit block on direct pushes to `main` | prevent | P1 | [project lead] | [#101](https://github.com/ilv78/Art-World-Hub/issues/101) |
| 3 | Add AI agent verification step: before any `git push`, agent must run `git branch --show-current` and abort if on `main` — reinforced in agent memory | prevent | P0 | [project lead] | [#97](https://github.com/ilv78/Art-World-Hub/issues/97) (done) |
| 4 | Clean up `main` branch history — decide whether to squash the push+revert commits or leave as audit trail | repair | P2 | [project lead] | [#97](https://github.com/ilv78/Art-World-Hub/issues/97) |
| 5 | Create proper PR from `feature/issue-8-admin-section` with code review and actual test cases for admin functionality | repair | P1 | [project lead] | [#8](https://github.com/ilv78/Art-World-Hub/issues/8) |
| 6 | Document this incident as the first entry in the postmortem index at `docs/postmortems/README.md` | document | P2 | [project lead] | [#102](https://github.com/ilv78/Art-World-Hub/issues/102) |

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
- [x] At least one `prevent`-type action item exists
- [x] Every action item has priority and owner placeholder
- [x] Timeline is complete and chronological
- [x] "Why wasn't it caught sooner?" is answered
- [x] Rollback usage (or non-usage) is documented
- [x] Glossary covers domain-specific terms
- [x] Document shared with all incident participants for input

---

## Glossary

| Term | Definition |
|------|------------|
| CI gate | The pipeline design where downstream jobs (Docker build, staging deploy) are skipped if upstream jobs (lint, type-check, test, build) fail |
| `main` | The primary branch; pushes to `main` trigger auto-deploy to staging via CI/CD |
| Feature branch | A branch named `feature/issue-N-description` or `fix/issue-N-description` used for development; merged to `main` via PR |
| Type check | Running `tsc` (TypeScript compiler) to verify type correctness without emitting code (`npm run check`) |
| Branch protection | GitHub feature that prevents direct pushes to a branch, requiring PRs with passing CI checks — requires GitHub Pro or public repo |
| Revert commit | A commit that undoes all changes from a previous commit, created by `git revert` |

---

## Appendix

- [Issue #97 — Post-mortem bug report](https://github.com/ilv78/Art-World-Hub/issues/97) — original incident report with action items
- [CI run (failed) — admin push to main](https://github.com/ilv78/Art-World-Hub/actions/runs/23060988758) — type-check failure details
- [CI run (passed) — revert commit](https://github.com/ilv78/Art-World-Hub/actions/runs/23062057129) — staging re-deploy confirmation
- [CI run (passed) — feature branch](https://github.com/ilv78/Art-World-Hub/actions/runs/23062107966) — fixed admin code on proper branch
- [Commit `7fb88be`](https://github.com/ilv78/Art-World-Hub/commit/7fb88be) — the direct push to main (15 files, 1612 insertions)
- [Commit `306b26e`](https://github.com/ilv78/Art-World-Hub/commit/306b26e) — the revert commit
