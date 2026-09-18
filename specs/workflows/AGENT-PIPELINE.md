# Agent Pipeline

**Status:** Active
**Last Updated:** 2026-09-18
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

## 1a. How a run starts

`.github/workflows/agent-dispatch.yml` triggers on `issues: labeled`. Applying
`agent-ready` starts a run; nobody has to be present.

Four guards decide whether it proceeds, and each exists because of a specific failure:

| Guard | Refuses when | Why |
|---|---|---|
| Label filter | the label is not `agent-ready` | — |
| Human-applied | `sender.type` is a bot | An agent that can self-label grants itself Tier B, and the tier boundary becomes decorative |
| Not already claimed | the issue carries `agent-working` or `agent-done` | §3: stop, do not race another run |
| Daily ceiling | more than `MAX_RUNS_PER_DAY` (10) runs today | A runaway loop plus an unbounded dispatcher is an invoice, not an incident |

Two properties of the run itself matter as much as the guards:

- **`concurrency: agent-run-<issue>`, never cancelling.** One run *per issue*; several
  issues run at once, bounded by `MAX_CONCURRENT` in the moment and `MAX_RUNS_PER_DAY` for
  the day. Until #808 the group was repository-wide because every PR appended to one
  `DECISION-LOG.md`; ADR-0010 made the log one file per decision, so that collision — and
  the one-deep queue that dropped every third label (#788) — no longer exists.
  `package-lock.json` can still conflict on dependency PRs; rebase and retry.
- **The PAT, not `GITHUB_TOKEN`.** A PR opened with `GITHUB_TOKEN` does not trigger
  `pull_request` workflows, so `Gated Path Review` and `PR Contract` would never run on
  agent PRs. The gate would be permanently absent on exactly the PRs it exists for.

**A dispatch that never starts leaves `agent-ready` in place**, so the retry is a
re-label rather than an investigation. The ceiling refusal says so on the issue.

**Known limit:** an agent acting with the developer's own credentials is
indistinguishable from the developer. The human-applied guard rejects bot accounts, not
impersonation — the same limit the gated-path check documents.

---

## 2. A Tier B run, start to finish

1. **Claim.** Add `agent-working`. If it is already there, another run holds the issue —
   stop rather than racing it.
2. **Branch.** `feature/issue-N-slug` off current `main`. Never work on `main`.
3. **Build.** The issue text is the spec. Where it is silent, take the most reversible
   option and declare it (policy §2) rather than asking.
4. **Document in the same commit** — spec, data model, a decision file under `specs/decisions/log/`, and any new
   standing rule (policy §8). Not a follow-up PR.
5. **Open the PR and label it.** `agent-review` for normal completion; `agent-stuck` or
   `agent-failed` instead when §3 says so. **The PR label is the signal** — the workflow
   reads it and writes the corresponding label onto the issue. Do not attempt to label the
   issue directly; that credential cannot (see the note below). The body must satisfy
   the PR contract (policy §9a, checked by `pr-contract.yml`): the issue reference, a
   `## Verification` section naming what CI does **not** cover, and any deviation from the
   issue stated outright.
6. **Merge.** `auto-merge.yml` enables auto-merge on the `agent-review` label; GitHub
   merges once required checks pass. Do not merge manually to get around a red check.
7. **Confirm staging.** The deploy job comments the commit, run link, reported version and
   smoke-test results on every issue referenced in the merge commit. Where the change's own
   behaviour is observable on staging, exercise it and post that too — the build being live
   is not the same claim as the feature working.
8. **Close out — the workflow does this, not the agent.** The staging deploy job applies
   `agent-done` + `release: next` to every `agent-ready` issue in the merge commit, once
   the smoke tests pass. `agent-done` therefore means the build is live, which is the only
   point at which that claim is true. Nothing is left for the developer to clear.

**Why the agent never touches the issue (#731, #771).** `RELEASE_PAT` cannot write to
issues at all:
`RELEASE_PAT` has `Contents: write` and `Pull requests: write` — checkout, push, PR open,
PR labels, PR comments all work — but every issue-side write (`addLabelsToLabelable`,
`removeLabelsFromLabelable`, `addComment`, `closeIssue`) returns
`403 Resource not accessible by personal access token`, on both the GraphQL and REST paths.
Issue *creation* succeeds, which is what makes this easy to miss — it looks like `Issues`
scope is present until a label or comment is attempted against an existing one. Step 1
("Claim") still works because it runs as a separate workflow step authenticated with
`${{ github.token }}` (job `permissions: issues: write`), not `RELEASE_PAT` — only the
agent's own session, steps 5 and 8, are affected.

**The scope was not widened; the lifecycle moved instead (#771).** Widening the PAT would
have been a credential change — gated list item 3, a human decision for that token forever
— and it would have kept the weaker design, where an agent declares its own outcome and a
run that *cannot* declare looks identical to one that chose not to.

So every issue-side write now happens in the workflow, under `${{ github.token }}`:

| Who | Writes | When |
|---|---|---|
| `agent-dispatch.yml`, step 1 | `agent-working` | on claim |
| `agent-dispatch.yml`, final step | drops `agent-working`; mirrors `agent-stuck` / `agent-failed` from the PR's labels; applies `agent-failed` if no PR exists at all | after the run, on every path |
| `ci.yml`, staging deploy | removes `agent-ready`, applies `agent-done` + `release: next` | after smoke tests pass |

The agent's half is to label the **PR**, which its credential can do. Status it wants a
human to read goes in a PR comment.

**There is no path that leaves an issue stranded.** The claim is released whether the run
succeeds, fails, or produces nothing — the failure that cost #688 three manual label
clearances before #771.

**A second, opposite-shaped PAT limit: it cannot touch `.github/workflows/` at all (#729).**
Where the issue-write limit above was fixed by moving the write to `${{ github.token }}`,
this one has no such escape — GitHub rejects the push server-side ("refusing to allow a
Personal Access Token to create or update workflow ... without `workflow` scope") for both
a brand-new workflow file and a one-line edit to an existing one, and `GITHUB_TOKEN` cannot
create or modify these paths either, by GitHub's own design, regardless of the `permissions:`
block a job declares. There is no alternate actor to reroute the write to. When an issue
needs a change under `.github/workflows/`, ship everything else, paste the exact file
content in a PR comment, and label the PR `agent-stuck` — a human applies it directly, or
decides whether to grant the PAT `workflow` scope, which is a credential change (gated list
item 3) and never the agent's call.

---

## 3. When it goes wrong

Labels in this table go on the **PR**, not the issue. `agent-dispatch.yml` mirrors them
onto the issue after the run (§2) — the agent's credential cannot write to issues.

| Situation | Action | PR label |
|---|---|---|
| The PR needs a gated change (§1) | Finish everything else, open the PR, let `Gated Path Review` fail. One batched comment: options, recommendation, what happens with no answer. | `agent-stuck` |
| The change needs a new or edited file under `.github/workflows/` (§2) | The PAT cannot push it, full stop. Finish and push everything else, paste the exact file content in a PR comment for a human to apply. | `agent-stuck` |
| Ambiguity the policy does not cover | Do **not** ask. Most reversible option, declared in the PR, written back into the policy. | — |
| Deviation the issue text does not cover | Ship it with the deviation declared in the PR body. | — |
| Deviation that changes what the issue is *for* | Drop to Tier A: post the interpretation and wait. | `agent-stuck` |
| CI red three cycles running on the same PR | Stop. Leave branch and PR intact. No fourth attempt, no force-push, no branch deletion. | `agent-failed` |
| The issue needs **no change** — already fixed, duplicate, or a mistaken premise | Do not open a PR and do not invent work to avoid an empty run. Write `no-change-needed` plus one paragraph of reasoning to `$GITHUB_WORKSPACE/.agent-outcome` and stop. | `agent-no-change` (issue, applied by the workflow) |
| Another run already holds the issue | Stop. Do not race. | — |
| Merge conflict on `package-lock.json` | Rebase and retry — it is regenerated by design. Not an escalation. (The decision log no longer conflicts: one file per decision since #808.) | — |
| **Required checks missing from the list entirely** | The PR is conflicted. Rebase — do not investigate the checks. | — |

Three outcomes, three states, and they are not interchangeable. `agent-stuck` waits
silently and pages nobody — work is sound and resumable. `agent-failed` is terminal and
needs a human to reset it. `agent-no-change` means the run succeeded and concluded there is
nothing to do: nothing is blocked, nothing broke, and nothing shipped. If `agent-stuck` and
`agent-failed` both somehow land on a PR, the mirror applies `agent-failed` —
over-escalating is the safe direction.

`agent-no-change` is the one outcome that does not travel on a PR label, because there is no
PR. It travels in `.agent-outcome`, read by the dispatcher in the same workspace. **Absence
of that file means failure**: a denied, crashed or truncated run writes nothing and is
recorded `agent-failed`, and a file whose first line is not exactly `no-change-needed` is
treated the same way. The new outcome costs a positive act by the agent; the old one is
still the default.

**The agent never closes an issue.** Whether an issue was valid is the developer's
judgement. `agent-no-change` and the reasoning comment put it in front of them; they close
it, or remove the label and re-apply `agent-ready` if they disagree.

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

### A red `Work the issue` step is not proof the run failed

`anthropics/claude-code-action` enforces `--max-turns` by *throwing after a successful
run*, not by cutting the run off mid-flight: `base-action/src/run-claude-sdk.ts` writes
`claude-execution-output.json` (via `writeExecutionFile`) before it checks the turn
count, and only then throws if `resultMessage.subtype === "success" && !is_error &&
num_turns > maxTurns`. So a run the action's own SDK considered successful can still end
the `Work the issue` step in `failure` — the transcript this workflow already keeps (see
"Keep the run transcript" above) is written regardless and says so.

Observed on #509 (run 35319082967, 2026-09-18): the step read `failure` at 208 turns
against a cap of 200, while the transcript's trailing record read `{"type":"result",
"subtype":"success","is_error":false,"num_turns":208}` and PR #817 was real, mergeable
SEO work. `Confirm the run produced work` happened to leave the issue alone only because
its branch-match check found PR #817 — incidental, not by design, since the step never
looked at the transcript. A run that overran turns **and** had not pushed a branch yet
would have been marked `agent-failed` on a false premise, burning a terminal state and a
`MAX_RUNS_PER_DAY` slot for a run that had, by the action's own account, succeeded (#818).

**The fix — read before writing to this file.** `Confirm the run produced work` should
parse the transcript's trailing `type: "result"` record (always the array's last element,
because the action's own read loop breaks immediately after appending it) before
declaring `agent-failed` on an empty PR-branch match: only `subtype == "success" &&
is_error == false` overrides the failure path, and even then the issue is left
`agent-stuck` (not silently cleared) pending a human look, since a missing branch is
still worth a glance. **Drafted, verified against six fixture transcripts (success,
`is_error:true`, no result message, empty array, missing file, missing `is_error` key)
and the full label/comment logic dry-run with a stubbed `gh`, but not shipped in the PR
that documents it** — `agent-dispatch.yml` is on `script/gated-paths.mjs`'s self-guarded
list *and* under the separate, unconditional `.github/workflows/` PAT restriction below,
so the agent that found this cannot push the fix. The exact diff is pasted in a PR
comment on the PR that carries this note, for a human to apply directly. See
`specs/decisions/log/2026-09-18-transcript-success-overrides-turn-cap-failure.md`.

One caught-by-testing gotcha worth keeping visible: `jq -r '.is_error // empty'` is the
wrong way to read a boolean. jq's `//` alternative operator treats `false` exactly like
`null` — so on the one value this check exists to detect (`is_error: false`), it silently
returns nothing. Use `if (.is_error==false) then ... end` instead of `// empty` on any jq
boolean check.

---

## 4. What is enforced by machinery rather than good intentions

| Rule | Enforced by |
|---|---|
| Gated changes need a human | `Gated Path Review`, a **required** status check on `main`; label authenticity read from the issue timeline so a bot-applied label is rejected |
| Only Tier B PRs merge themselves | `auto-merge.yml`, conditioned on `agent-review` / `autorelease` |
| The gate cannot be widened quietly | `script/gated-paths.mjs`, its workflow, and `auto-merge.yml` are self-guarded paths |
| Production is never automatic | `deploy-production.yml` is `workflow_dispatch` only |
| Only a human starts a run, at most `MAX_CONCURRENT` at once, within a spend ceiling | `agent-dispatch.yml` — label filter, `sender.type` check, per-issue concurrency group, `MAX_CONCURRENT`, `MAX_RUNS_PER_DAY` |
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
- `specs/decisions/log/` — where every non-obvious choice is recorded, one file each (the table at `DECISION-LOG.md` is frozen history)
