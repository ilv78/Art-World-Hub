---
date: 2026-09-18
title: Fix drafted (not shipped) for dispatcher misreading a --max-turns overrun as a failed run
issue: 818
category: Infrastructure
---

#818 reported run 35319082967 (#509's dispatch): the `Work the issue` step read
`failure` after 208 turns against `--max-turns 200`, but the run had genuinely
succeeded — PR #817 was real, mergeable SEO work, and `Confirm the run produced work`
only left the issue alone because its PR-branch match happened to find #817. That is
incidental, not by design: the step never looks at *why* `Work the issue` failed, only
at whether a PR exists. A run that overran turns **and** had not pushed a branch in time
would have been marked `agent-failed` — a terminal state and a burned
`MAX_RUNS_PER_DAY` slot — for a run the action itself considered successful.

**Root cause, confirmed by reading `anthropics/claude-code-action`'s source
(`base-action/src/run-claude-sdk.ts`) at the pinned SHA.** `--max-turns` is not
enforced by cutting the SDK loop off mid-run. The action reads every message,
writes `claude-execution-output.json` via `writeExecutionFile(messages)`, and *only
after that* checks `resultMessage.subtype === "success" && !is_error &&
num_turns > maxTurns` and throws if so. The transcript this workflow already keeps
as an artifact (`specs/decisions/log/2026-09-17-*.md`, the two rows about
`claude-execution-output.json`) therefore reflects the true outcome even when the step
itself is red. The file is a JSON array (`JSON.stringify(messages, null, 2)`, not
JSONL), and the result message — when one exists — is always the array's last element,
because the action's own read loop `break`s immediately after appending it.

**Chosen fix, drafted against `.github/workflows/agent-dispatch.yml`'s `Confirm the
run produced work` step:** before falling through to `agent-failed` on an empty
PR-branch match, parse the transcript's trailing `type: "result"` record. If
`subtype == "success" && is_error == false`, do not apply `agent-failed` — apply
`agent-stuck` instead (not a silent no-op: a missing branch is still worth a human
glance even when the action itself is satisfied) with a comment naming the turn count
and pointing at re-applying `agent-ready` or raising `--max-turns`. Anything else
(missing transcript, malformed record, a real `is_error: true` failure) falls through
to `agent-failed` unchanged — the existing "err terminal" rule the `OUTCOME_FILE` check
above it already follows. When a PR *is* found (the actual #509 shape), the fix adds
only a `::notice::` log line for visibility; no label or comment path changes, since a
found PR was already handled correctly.

**Verified without shipping.** The full patched workflow parses as valid YAML; the
extracted `run:` script passes `bash -n` and `shellcheck -S warning` clean. The
transcript-parsing logic was run against six fixture transcripts (success matching the
issue's exact example, `is_error:true`, no result message, empty array, missing file,
missing `is_error` key) and the complete step — PR lookup, label edits, comment body,
`no-change-needed` priority — was dry-run end-to-end against a stubbed `gh` covering all
seven label-lifecycle branches (no-PR-success, no-PR-real-failure, no-PR-missing-
transcript, PR-found-with-transcript-success, PR-found-plain, PR-found-already-stuck,
no-change-needed-takes-priority-over-transcript). One real bug surfaced only by this
testing: `jq -r '.is_error // empty'` returns empty on `is_error: false`, because jq's
`//` operator treats `false` as falsy exactly like `null` — the fix uses
`if (.is_error==false) then ... end` instead.

**Not shipped in this PR — a hard, previously-confirmed platform limit, not a policy
choice.** `specs/AGENT-AUTONOMY-POLICY.md` §3 records (from #729, reconfirmed today on
#692's PR) that the agent's PAT is rejected server-side on *any* push touching
`.github/workflows/`, new file or one-line edit, with no `GITHUB_TOKEN` workaround.
`agent-dispatch.yml` is additionally on `script/gated-paths.mjs`'s self-guarded list, so
even a PAT that could push it would still need a human `human-approved` label to merge.
Both restrictions exist for the same reason: this file decides what starts an unattended
agent run, and an agent that could edit it unilaterally could remove every guard in it.
The exact diff (the full new `Confirm the run produced work` step) is pasted in a
comment on the PR that carries this file, for a human to apply directly, following the
identical pattern set by #692/#729.

**To reverse:** the documentation changes here (this file, the `AGENT-AUTONOMY-POLICY.md`
§9 rule and revision-log row, the `AGENT-PIPELINE.md` §3 subsection) are plain reverts,
no behavioral dependency — nothing in the running pipeline changes until a human applies
the pasted diff. If the diff is applied and turns out wrong, reverting the one workflow
step is a single-file `git revert` with no migration or data implication.
