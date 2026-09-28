---
date: 2026-09-18
title: Defer the agent-working label cleanup in ci.yml to a human — PAT cannot push it
issue: 819
category: Infrastructure
---

#819 reported that `.github/workflows/ci.yml`'s post-deploy step (around line 388)
closes the agent lifecycle with:

```
gh issue edit "$issue" --remove-label agent-ready --add-label agent-done --add-label "release: next"
```

It never removes `agent-working`. Observed live on #538 (closed 2026-09-18, part of the
#808 batch acceptance test): the final label set was `agent-working`, `agent-done`,
`release: next` together — `agent-working` never cleared. Harmless on a closed issue
today, but incorrect bookkeeping: `agent-working` is supposed to mean "a run currently
holds the claim," the opposite of `agent-done`. If a future sweep, dashboard, or report
ever keys off `agent-working` presence instead of issue state, a done-and-closed issue
would misreport as claimed.

**The fix is a one-line addition** — `--remove-label agent-working \` alongside the
existing `--remove-label agent-ready \` in that block — and is entirely contained in
`.github/workflows/ci.yml`. There is no other file to change and no other work in this
issue to ship separately.

**Not pushed.** `specs/AGENT-AUTONOMY-POLICY.md` §3 (from #729, most recently applied in
#692/#821) records that the agent's PAT is rejected server-side on *any* change under
`.github/workflows/` — new file or edit — with no `GITHUB_TOKEN` workaround. This is a
hard platform restriction tied to the PAT's missing `workflow` scope, not a policy
choice, so there is nothing to work around by restructuring the change. The exact diff
is pasted in a PR comment for a human to apply directly. This run does not request the
PAT's `workflow` scope, since granting it is a credential change (gated list item 3) and
never the agent's call.

Because the entire fix lives in the blocked file, this PR carries no application code
change — only this decision file and the PR's own escalation comment. That is expected:
the pattern from #692/#821 ships whatever *can* move independently of the blocked file
and pastes the rest; here nothing can move independently, so the PR is documentation and
escalation only.

**To reverse:** delete this file. The diff was never applied, so there is nothing else
to reverse — only a human decision still pending on the pasted PR comment.
