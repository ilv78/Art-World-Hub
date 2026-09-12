# Agent Pipeline

**Status:** Active
**Last Updated:** 2026-09-11
**Issue:** [#744](https://github.com/ilv78/Art-World-Hub/issues/744)

Operational companion to `specs/AGENT-AUTONOMY-POLICY.md`. The policy says *what* the
rules are; this says *how a run executes them* — the labels, the order, and what happens
when something goes wrong.

---

## 1. The two lanes

| | Tier A · escorted | Tier B · autonomous |
|---|---|---|
| Entered by | the default — no label | `agent-ready`, applied by a human |
| Plan comment + approval | **required** | not required |
| Merge | a human merges, or applies `agent-review` | auto-merges on green |
| Ends at | wherever the developer says | staging |
| Gated changes (§1) | `human-approved` | `human-approved` |
| Production | developer's `workflow_dispatch` | developer's `workflow_dispatch` |

There is no tier in which an agent applies `agent-ready` to an issue, including its own.

---

## 2. A Tier B run, start to finish

1. **Claim.** Add `agent-working`. If it is already there, another run holds the issue —
   stop rather than racing it.
2. **Branch.** `feature/issue-N-slug` off current `main`. Never work on `main`.
3. **Build.** The issue text is the spec. Where it is silent, take the most reversible
   option and declare it (policy §2) rather than asking.
4. **Document in the same commit** — spec, data model, decision-log row, and any new
   standing rule (policy §8). Not a follow-up PR.
5. **Open the PR**, label it `agent-review`, drop `agent-working`. The body must satisfy
   the PR contract (policy §9a, checked by `pr-contract.yml`): the issue reference, a
   `## Verification` section naming what CI does **not** cover, and any deviation from the
   issue stated outright.
6. **Merge.** `auto-merge.yml` enables auto-merge on the `agent-review` label; GitHub
   merges once required checks pass. Do not merge manually to get around a red check.
7. **Confirm staging.** The deploy job comments the commit, run link, reported version and
   smoke-test results on every issue referenced in the merge commit. Where the change's own
   behaviour is observable on staging, exercise it and post that too — the build being live
   is not the same claim as the feature working.
8. **Close out.** `agent-done` + `release: next`. Wait for **every** pipeline triggered by
   the merge — CI/CD, Security, Documentation Agent — before calling it done (policy §9.4).

---

## 3. When it goes wrong

| Situation | Action | Label |
|---|---|---|
| The PR needs a gated change (§1) | Finish everything else, open the PR, let `Gated Path Review` fail. One batched comment: options, recommendation, what happens with no answer. | `agent-stuck` |
| Ambiguity the policy does not cover | Do **not** ask. Most reversible option, declared in the PR, written back into the policy. | — |
| Deviation the issue text does not cover | Ship it with the deviation declared in the PR body. | — |
| Deviation that changes what the issue is *for* | Drop to Tier A: post the interpretation and wait. | `agent-stuck` |
| CI red three cycles running on the same PR | Stop. Leave branch and PR intact. No fourth attempt, no force-push, no branch deletion. | `agent-failed` |
| Another run already holds the issue | Stop. Do not race. | — |
| Merge conflict on `DECISION-LOG.md` or `package-lock.json` | Rebase and retry — these conflict by design (append-only log, regenerated lockfile). Not an escalation. | — |
| **Required checks missing from the list entirely** | The PR is conflicted. Rebase — do not investigate the checks. | — |

`agent-stuck` waits silently and pages nobody. `agent-failed` is terminal and needs a human
to reset it. They are different states; do not use one for the other.

### Checks that are absent are not checks that passed

`pull_request` workflows run against the merge ref (`refs/pull/N/merge`). GitHub cannot
build that ref while a PR has conflicts, so those workflows **do not run at all** — they
do not fail, they do not queue, they are simply missing from the checks list.
`pull_request_target` and `push` workflows are unaffected, which is what makes it
deceptive: the summary is green and busy, and only the two checks that matter are gone.

Observed on #751 after #749 and #750 merged underneath it: `Gated Path Review` and
`PR Contract` were both absent while 23 other checks passed. It took
`gh run list --workflow=gated-paths.yml` to notice.

This is **not** a merge bypass — a required check that never reports leaves the PR
blocked on *Expected — waiting for status to be reported*, and a conflicted PR cannot
merge anyway. The cost is that an agent reading a green summary will report work as
verified when the gate never ran. **Before calling a PR green, check that the required
checks are present, not merely that nothing is red.**

---

## 4. What is enforced by machinery rather than good intentions

| Rule | Enforced by |
|---|---|
| Gated changes need a human | `Gated Path Review`, a **required** status check on `main`; label authenticity read from the issue timeline so a bot-applied label is rejected |
| Only Tier B PRs merge themselves | `auto-merge.yml`, conditioned on `agent-review` / `autorelease` |
| The gate cannot be widened quietly | `script/gated-paths.mjs`, its workflow, and `auto-merge.yml` are self-guarded paths |
| Production is never automatic | `deploy-production.yml` is `workflow_dispatch` only |
| Documentation is not optional | Documentation Agent on every PR |
| A PR says what it did and did not verify | `pr-contract.yml`, a **required** check since #752 — declaration only; it cannot check that the claim is true. Dependabot and `autorelease` PRs are exempt and report *skipped*. |
| The change survives a real environment | Staging deploy + smoke tests, evidence posted to the issue |

**Not enforced by machinery, and honest about it:** spending money or reaching a third
party, and deleting things that are not in git. Neither is visible in a diff. They stay
policy rules backed by the PR's own declaration.

**Known limit:** an agent acting with the developer's own credentials is indistinguishable
from the developer. The timeline check rejects *bot* accounts, not impersonation.

---

## 5. Trial

Tier B is active under per-issue labelling. Two weeks, then four numbers (#744):
autonomously merged PRs; how many were reverted or amended afterwards; escalations that
reached the developer, and whether each was already answerable from existing docs; CI
failure rate on agent PRs against the historical baseline.

The question the developer actually answers at the end: **how many merges would you have
objected to?** Zero or one → widen, most plausibly by making `agent-ready` the default for
some issue class. More than that → the policy file is thin, and the trial says where.

---

## Related

- `specs/AGENT-AUTONOMY-POLICY.md` — the rules themselves; §1 the gated list, §1a the tiers
- `specs/workflows/CI-CD.md` — what the pipeline runs
- `specs/workflows/DEPLOYMENT.md` — staging and production deploys
- `specs/decisions/DECISION-LOG.md` — where every non-obvious choice is recorded
