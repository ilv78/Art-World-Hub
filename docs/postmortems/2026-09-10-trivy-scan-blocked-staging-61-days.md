---
title: "Container scan gate blocked staging deploys for 61 days while weekly alerts went unactioned"
date: 2026-09-10
severity: P1
status: Action Items Open
trigger: "Monitoring failure — the alert fired repeatedly and was not acted on; discovered by a manual architecture review, not by the alert"
distribution: public
owner: "[Role — e.g. platform lead]"
participants: "[Roles — e.g. platform lead, reviewing architect]"
components: "CI/CD pipeline, container image build, staging deployment"
incident_state_doc: "None — no live incident document existed; reconstructed from GitHub Actions history and issue #710"
---

# Postmortem: Container scan gate blocked staging deploys for 61 days

> **Status:** Action Items Open — reviewed by the developer; action items filed
> **Severity:** P1
> **Distribution:** Public
> **Incident window:** 2026-07-11 20:17 UTC → 2026-09-10 20:17 UTC
> **Published:** 2026-09-10

---

## Executive Summary

Between 2026-07-11 and 2026-09-10, every CI run on `main` failed at the `Build & Trivy Container Scan` job. Because the staging deploy depends on that job, **staging did not deploy for 61 days**, and 16 merges to `main` never ran in any environment. Production has not been deployed since 2026-07-05 — **67 days as of this writing** — so a merged security fix closing a mass-IDOR and privilege-escalation hole in the MCP endpoint is **still not in production**.

No code change caused this. The trigger was external: new CVEs entering Trivy's vulnerability database matched packages the project does not control, in the base image's bundled npm and in a build-time bundler binary. A second, independent cause compounded it three weeks later when five `libgnutls30` suppressions reached their `expired_at` date and lapsed.

The failure alert was not missing. A Telegram notification fired on **every** weekly failure — at least 13 confirmed alerts across five consecutive Mondays — and none were acted on. The problem was eventually found by a manual architecture review 33 days after onset, and fixed 28 days after that.

**The single most important preventive action** is to stop treating "any HIGH/CRITICAL anywhere in the image" as a build-breaking condition when the finding is in vendored content the project cannot patch — and to make the alert for a red `main` persistent and escalating rather than a repeating ping that arrives inside routine Monday dependabot noise.

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Duration | 61 days (2026-07-11 20:17 UTC → 2026-09-10 20:17 UTC) |
| Production deploy gap | **67 days and ongoing** — last production deploy 2026-07-05 |
| Users / requests affected | **0** — no user-visible degradation at any point |
| Features / endpoints affected | None in production |
| Error rate during incident | N/A — production served normally throughout |

Production was never degraded. The impact was entirely to the delivery pipeline and to security posture.

### System Impact

- [ ] API availability degraded
- [ ] Database access affected
- [ ] 3D museum experience impacted
- [ ] Storage / asset retrieval broken
- [x] CI/CD pipeline affected
- [x] Security: a merged security fix remained undeployed for 61 days
- [x] Other: staging environment frozen; 16 merges shipped without container-scan validation

### Data / Security Impact

- **Data affected:** None. No data loss, corruption, or exposure.
- **Credentials potentially exposed:** None.
- **User data at risk:** No direct exposure — but a security fix remains undeployed, see below.

The sharpest consequence is a **security fix that is still not in production**, not an active exposure.

[#695](https://github.com/ilv78/Art-World-Hub/pull/695) (merged 2026-07-10, closing [#681](https://github.com/ilv78/Art-World-Hub/issues/681) — "MCP endpoint missing per-tool authorization: mass IDOR + privilege escalation") merged one day before the pipeline broke.

Verified build identity rather than release string:

| Environment | Build | Last deployed | Contains #695? |
|---|---|---|---|
| Staging | 1862 (`41bd3d3`, current `main`) | 2026-09-10 | Yes — reached staging 2026-07-10, in the last green run before the break |
| Production | 1755 (`v3.19.0`, tagged 2026-07-05) | **2026-07-05 — 67 days ago** | **No** |

So the fix did reach staging before the pipeline froze. It has **never reached production**, and that remains true at the time of writing. Any user able to authenticate retains the pre-fix ability to act across tenants via `/mcp` in production. Whether that was exercised is **UNKNOWN — `/mcp` access-log review needed before publishing**.

The container scan did not block production deploys directly — those are `workflow_dispatch` and independent of the staging gate. It blocked them *in effect*: the documented promotion process is "verify on staging, then promote," and with staging frozen there was nothing validated to promote. Issue #710 states this outcome explicitly: "A release cut today would promote a month of unvalidated code or be blocked outright."

Sixteen merges reached `main` unvalidated by a container scan, including [#708](https://github.com/ilv78/Art-World-Hub/pull/708) (53 package bumps) and [#724](https://github.com/ilv78/Art-World-Hub/pull/724) (21 package bumps).

### Revenue / Business Impact

None identified. No customer-facing capability was degraded.

---

## What Changed Last

The mandated first question, and in this incident the answer is unusual: **no change inside the repository caused the failure.**

| Change | Type | Timestamp (UTC) | Notes |
|--------|------|-----------------|-------|
| `04fc3e5` — "fix: agent allowlist was appended to deny array" ([#697](https://github.com/ilv78/Art-World-Hub/pull/697)) | config | 2026-07-11 ~20:00 | The commit on which CI first failed. Touches only `.claude/settings.json`. **Cannot affect the container image** — ruled out. |
| `16f62eb` — last green run on `main` (run `29105455266`) | config | 2026-07-10 15:55 | Last known-good state. |
| New CVE disclosures entering the Trivy advisory database | **external data** | between 2026-07-10 and 2026-07-11 | **The actual trigger.** Not visible in the repository's change log. |
| Five `libgnutls30` suppressions reaching `expired_at: 2026-07-25` (added 2026-05-25 in `8f583cd`, [#630](https://github.com/ilv78/Art-World-Hub/pull/630)) | config | 2026-07-25 00:00 | A **second, independent** cause that began contributing 14 days after onset. |

This is the important structural observation: the project's CI correctness depends on an **external, continuously-updated data source that no one in the project controls or watches**. A pipeline can go from green to red with an empty diff. The standard "what changed last" investigation looks at the repository and finds nothing — which is exactly why this class of failure resists the usual diagnostic reflex.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 2026-05-25 | Five `libgnutls30` CVEs suppressed with `expired_at: 2026-07-25`, pointing at [#629](https://github.com/ilv78/Art-World-Hub/issues/629) "base-image rebuild" as the real fix |
| 2026-07-05 21:45 | Last production deploy — `v3.19.0`, build 1755. No production deploy since |
| 2026-07-10 15:55 | Last successful CI run on `main` (`16f62eb`, run `29105455266`) — staging deployed, including #695 |
| 2026-07-10 | [#695](https://github.com/ilv78/Art-World-Hub/pull/695) merged — MCP per-tool authorization security fix |
| 2026-07-11 20:17 | **First failure.** Run `29166776469` on `04fc3e5` fails at `Build & Trivy Container Scan`. Staging stops deploying from this point |
| 2026-07-13 07:10 | Second failure (`050576f`) — weekly dependabot push |
| 2026-07-25 | `libgnutls30` suppressions expire, adding a second independent failure cause to an already-red pipeline |
| 2026-07-20 → 2026-09-07 | Failure repeats on every weekly dependabot push. Telegram failure alerts fire 2–3× per occurrence |
| 2026-08-10 | [#708](https://github.com/ilv78/Art-World-Hub/pull/708) (53 package bumps) auto-merges to `main` with the scan red |
| 2026-08-13 | **Detection.** A manual CI/CD architecture review identifies the frozen pipeline; issue [#710](https://github.com/ilv78/Art-World-Hub/issues/710) filed — 33 days after onset |
| 2026-09-10 19:19 | [#721](https://github.com/ilv78/Art-World-Hub/pull/721) auto-merges with the scan still red |
| 2026-09-10 19:49 | [#723](https://github.com/ilv78/Art-World-Hub/pull/723) auto-merges with the scan still red |
| 2026-09-10 ~20:00 | Fresh scan run; 21 findings triaged into three groups by ownership |
| 2026-09-10 20:17 | [#725](https://github.com/ilv78/Art-World-Hub/pull/725) merged — `libgnutls30` patched in-image, remaining vendored findings suppressed. Pipeline unblocked |

---

## Root Causes and Trigger

### What Changed Last (Summary)

Nothing in the repository. New CVE disclosures landed in Trivy's advisory database and matched vendored content, turning a green pipeline red against an unchanged image definition.

### Trigger

New HIGH/CRITICAL advisories published into the Trivy vulnerability database between 2026-07-10 and 2026-07-11, matching packages inside the `node:25-bookworm-slim` base image's bundled npm and inside `drizzle-kit`'s bundled esbuild Go binary.

### Root Cause Analysis

```
Failure mode 1: A CI gate breaks without any change to the code it gates.
  Why? → Trivy fails the build on any HIGH/CRITICAL finding anywhere in the image,
         and its advisory database updates continuously and independently of us.
  Why? → The scan policy draws no distinction between "a dependency we choose and
         can upgrade" and "vendored content we cannot patch" — the base image's
         bundled npm, and a build-time bundler binary.
  Why? → SYSTEM GAP: the gate encodes "zero known HIGH/CRITICAL in the image" as the
         success condition, when the actionable condition is "zero unaddressed
         HIGH/CRITICAL in code we control." Every upstream disclosure against
         vendored content therefore becomes our build break, and the only available
         response is to hand-write a suppression.

Failure mode 2: Suppression expiry lands as a build failure rather than a warning.
  Why? → Five libgnutls30 entries reached expired_at: 2026-07-25 and lapsed.
  Why? → expired_at is enforced silently at scan time — nothing surfaces an entry
         that is about to lapse.
  Why? → SYSTEM GAP: expiry was designed as a forcing function to prompt review, but
         the force is delivered as a red pipeline after the fact rather than a
         reminder before it. The mechanism intended to prevent stale suppressions
         instead adds a second failure to an already-red pipeline — and in this case
         landed while nobody was watching, so it forced nothing.

Failure mode 3: main stayed red for 33 days before anyone noticed.
  Why? → The Telegram failure alert fired and was not acted on.
  Why? → The alert is a single ephemeral message per failed run, arriving 2–3× in a
         burst, at 07:13 UTC on Mondays, interleaved with routine dependabot
         notifications for the same push.
  Why? → SYSTEM GAP: there is no persistent, escalating signal for "main is red" and
         no state anywhere that distinguishes "failed once" from "has been failing
         for six weeks." A notification that repeats identically every week and
         requires a human to notice it is repeating is indistinguishable from noise.
```

**Contributing factor A: branch protection did not require the scan.**

```
  Why? → 16 PRs auto-merged to main while the scan was red.
  Why? → Branch protection requires only the lint/type/test/build check; the
         container scan is not a required status check.
  Why? → SYSTEM GAP: the gate that blocked deployment did not block merging. Work
         kept flowing onto main, so the red pipeline produced no felt friction — the
         one signal that reliably prompts action. Already tracked as
         [#641](https://github.com/ilv78/Art-World-Hub/issues/641); this incident is
         evidence of its cost.
```

**Contributing factor B: main CI ran only weekly.**

```
  Why? → Between failures, the only pushes to main were the weekly dependabot batch.
  Why? → Low merge frequency during a quiet development period.
  Why? → SYSTEM GAP: the red state was sampled roughly once a week, so the pipeline
         could sit broken for 7 days at a time without generating a single new
         signal. Scheduled scans that would have sampled independently are disabled
         — tracked in [#533](https://github.com/ilv78/Art-World-Hub/issues/533).
```

**Contributing factor C: the recorded fix for `libgnutls30` did not work.**

```
  Why? → The suppressions pointed at #629, "base-image rebuild," as the real fix.
  Why? → As of 2026-09-10 node:25-bookworm-slim still ships 3.7.9-2+deb12u6, while
         Debian bookworm has had 3.7.9-2+deb12u7 available for months.
  Why? → SYSTEM GAP: the remediation plan depended on a third party acting, with no
         check that they had, and no fallback. Anyone picking up #629 would have
         rebuilt, seen no change, and had no documented next step. A targeted
         --only-upgrade in the Dockerfile was available the entire time.
```

### Why Wasn't This Caught Earlier?

It *was* caught, repeatedly, by the mechanism built for exactly this purpose — and the catch did not convert into action.

The `ci-failure-notify.yml` workflow was added in [#631](https://github.com/ilv78/Art-World-Hub/issues/631) after a near-identical incident (v3.18.0: six consecutive main-CI Trivy failures with auto-merge still firing). It worked as designed: **at least 13 Telegram alerts fired** across 2026-08-10, 08-17, 08-24, 08-31 and 09-07 — 2–3 per failing push, on every occurrence in the window where run history is still retained. Earlier alerts very likely fired too; GitHub's run history no longer reaches back to confirm.

So the honest finding is not "monitoring was missing." It is that **an alert nobody acts on is not monitoring**. The alert had no escalation, no persistence, no acknowledgement, and no distinction between the first failure and the twentieth. It arrived in the same Monday-morning burst as routine dependabot chatter, and became part of the background.

The staging environment itself was a second missed signal: `/api/version` served the same build for two months. Nothing watches for staging going stale.

---

## Detection

| Field | Value |
|-------|-------|
| Detection method | **Manual architecture review** (CI/CD review, finding CICD-01 of 9) |
| Time from failure start to detection | **33 days** (2026-07-11 → 2026-08-13) |
| Alert that fired (if any) | `CI Failure Notifier` → Telegram. Fired ≥13 times. Not acted on |
| Why wasn't it caught sooner? | The alert was ephemeral, weekly, repetitive and indistinguishable from routine dependabot notification volume. No persistent "main is red" state existed anywhere a human would encounter it |

Time from detection to resolution was a further **28 days** (2026-08-13 → 2026-09-10), during which the issue sat with a documented plan awaiting pickup.

---

## Response and Mitigation

### Immediate Mitigation

None was applied during the 61 days. The pipeline stayed red; work continued to merge around it because branch protection permitted that.

**Was rollback triggered?** Not applicable — there was no bad deploy to roll back. The failure prevented deploys rather than causing one.

### Full Resolution

[#725](https://github.com/ilv78/Art-World-Hub/pull/725), merged 2026-09-10 20:17 UTC, after triaging all 21 findings by **who owns the fix**:

1. **`libgnutls30`** (2 CRITICAL + 3 HIGH) — fixed for real, not suppressed. `apt-get install -y --only-upgrade libgnutls30` appended to the run stage's existing `fontconfig` layer, pulling `3.7.9-2+deb12u7` from bookworm. The five expired suppressions were **deleted** rather than date-extended. Verified in the built image.
2. **npm-CLI-bundled** (1 CRITICAL + 7 HIGH: `tar`, `pacote`, `brace-expansion`, `ip-address`) — suppressed. Verified these live in the base image's bundled npm and not in the project: `tar` and `pacote` are absent from the dependency tree entirely, and the project's own `brace-expansion` (5.0.9) and `ip-address` (10.7.0) are already newer than the versions Trivy reports.
3. **Go stdlib in `drizzle-kit`'s esbuild** (8 HIGH) — path-scoped suppression. Fifth recurrence of a documented pattern.

Verified on the `main`-push run (`34525511519`), not only PR-side: `Build & Trivy Container Scan: success`, `Deploy to Staging: success`. Staging now runs `41bd3d3`, matching `main` HEAD — confirmed via the deployed `IMAGE_TAG`, not `/api/version`.

**Production remains on the 2026-07-05 build.** Unblocking the pipeline does not deploy it; a production release is still required.

### What Slowed Recovery

- **A documented remediation plan that could not work.** Issue #710 proposed lockfile bumps for `tar`, `brace-expansion`, `fast-uri` and `ip-address`. Three of those are not reachable from the lockfile at all. Anyone following the plan literally would have refreshed the lockfile, seen the same failures, and had to re-diagnose from scratch.
- **Findings presented as one undifferentiated list.** Trivy reports 21 findings across three scan targets with no signal about which are actionable. The triage that made the fix obvious — grouping by who owns the fix — had to be done by hand.
- **The `#629` dead end**, as described in Contributing factor C.
- **28 days between detection and pickup.** The issue was correctly filed, correctly prioritised `critical`, and then waited.

---

## Credential and Secret Rotation

N/A — no credentials were exposed or involved.

---

## Lessons Learned

### What Went Well

- The `ci-failure-notify.yml` workflow built after [#631](https://github.com/ilv78/Art-World-Hub/issues/631) **fired correctly on every single failure** — ≥13 alerts. The detection mechanism worked exactly as designed.
- Issue #710 captured a precise, evidence-backed description of the failure — last-green run ID, affected job, blocker breakdown — which made the eventual fix substantially faster.
- The `.trivyignore.yaml` convention (mandatory `statement` + `expired_at`, path-scoping preferred) meant every prior suppression could be re-verified rather than taken on trust. The file's own discipline is what exposed the expired `libgnutls30` entries.
- Once picked up, diagnosis to merged fix took roughly one hour, including a local image build and full scan reproduction.

### What Went Poorly

- A CI gate whose success condition depends on an external database that changes daily, with no owner watching it, and where the only response to most findings is a hand-written suppression.
- Alerts fired ~13 times over five weeks and produced no action. The system had no way to notice that the same alert kept arriving.
- Branch protection let 16 merges proceed past a gate that was blocking deployment — removing the friction that would have forced attention.
- A security fix ([#695](https://github.com/ilv78/Art-World-Hub/pull/695)) sat undeployed for 61 days with nothing tracking that merged ≠ deployed.
- The recorded remediation for `libgnutls30` (#629, "rebuild the base image") had never been verified as workable, and was not.
- This is the **third** incident of this class — [#631](https://github.com/ilv78/Art-World-Hub/issues/631) (v3.18.0, six consecutive Trivy failures), [#670](https://github.com/ilv78/Art-World-Hub/issues/670) (main red across an idle period), now this. Each produced a fix for the specific CVEs and left the structural cause in place.

### Where We Got Lucky

- **The still-undeployed fix is for an authenticated-only attack surface.** [#681](https://github.com/ilv78/Art-World-Hub/issues/681) requires a logged-in account to exploit. Had it been unauthenticated, 67 days of production exposure on a live marketplace would have been materially worse.
- **The fix did reach staging** on 2026-07-10, in the last green run before the break — one day of margin. Had the pipeline broken 24 hours earlier, it would have been absent from both environments.
- **Nothing needed to ship urgently.** The 61-day window fell in a quiet development period. The same freeze during a release or an incident response would have blocked the fix for it.
- **Production kept running.** The break prevented deploys rather than breaking a deploy. A gate that failed *open* — shipping an unscanned image — would have been the more dangerous failure.
- **Backups were added ([#682](https://github.com/ilv78/Art-World-Hub/issues/682)) days after the pipeline was unblocked, not before.** Had a data-loss event occurred during the freeze, there was no database backup of any kind for the entire 61 days.

---

## Action Items

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | Make "main is red" a persistent, escalating signal: track consecutive-failure count and escalate distinctly at N≥2 (e.g. daily reminder while red, message states "failing for X days"), so a repeating alert is visibly different from a first alert | detect | **P0** | [role] | [#727](https://github.com/ilv78/Art-World-Hub/issues/727) |
| 2 | Split the container scan into two gates: findings in project-controlled dependencies fail the build; findings in vendored content (base-image bundled npm, build-time binaries) report as warnings on a separate non-blocking check | prevent | **P0** | [role] | [#728](https://github.com/ilv78/Art-World-Hub/issues/728) |
| 3 | Make the container scan a required status check in branch protection so merging cannot outpace a gate that blocks deployment — closes the gap this incident demonstrated | prevent | **P1** | [role] | [#641](https://github.com/ilv78/Art-World-Hub/issues/641) |
| 4 | Add a weekly job that fails when any `.trivyignore.yaml` entry is within 14 days of `expired_at`, so expiry surfaces as a warning before it becomes a build failure | detect | **P1** | [role] | [#729](https://github.com/ilv78/Art-World-Hub/issues/729) |
| 5 | Re-enable scheduled security scans so the advisory database is sampled daily rather than only on push | detect | **P1** | [role] | [#533](https://github.com/ilv78/Art-World-Hub/issues/533) |
| 6 | Add an environment-freshness check comparing each environment's **deployed commit SHA** against `main`, alerting when an environment falls behind by more than N days. Must not use `/api/version` — that reports the release tag, was identical (`v3.19.0`) on a fresh and a 67-day-stale environment during this incident, and would have shown nothing wrong | detect | **P1** | [role] | [#730](https://github.com/ilv78/Art-World-Hub/issues/730) |
| 7 | Require that any suppression naming an external fix (e.g. "base-image rebuild") records how the fix was verified as available, and a fallback if upstream has not acted | document | P2 | [role] | [#731](https://github.com/ilv78/Art-World-Hub/issues/731) |
| 8 | Deploy the MCP per-tool authorization fix ([#695](https://github.com/ilv78/Art-World-Hub/pull/695)) to production — it has been merged and staging-validated since 2026-07-10 and is still absent from production | repair | **P0** | [role] | [#726](https://github.com/ilv78/Art-World-Hub/issues/726) |

⚠️ **NEEDS DETAIL** on item 1: escalation channel beyond Telegram (the current channel demonstrably did not convert to action) is an open design question for the reviewer.

---

## Security-Specific Action Items

Not a security incident in the compromise sense — no exposure, no credentials involved. One security-adjacent item:

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | Review production `/mcp` access logs from 2026-07-05 to the date #695 actually reaches production, for cross-tenant tool calls, to confirm the pre-#695 authorization gap was not exercised | detect | **P1** | [role] | [#732](https://github.com/ilv78/Art-World-Hub/issues/732) |

---

## Review Checklist

- [x] No individual names in failure or root-cause sections
- [x] Every impact claim has a number or explicit estimate
- [x] Root cause analysis goes at least 2 levels deep (past the human action, to the system gap)
- [x] Multiple contributing factors documented separately where present
- [x] "What Changed Last" section is complete — including the finding that no in-repo change caused it
- [x] At least one `prevent`-type action item exists (items 2, 3)
- [x] Every action item has priority and owner placeholder
- [x] Timeline is complete and chronological
- [x] "Why wasn't it caught sooner?" is answered
- [x] Rollback usage (or non-usage) is documented
- [x] Glossary covers domain-specific terms
- [x] Document shared with all incident participants for input

**Open items for the reviewer:**

1. `/mcp` production access-log review is marked `UNKNOWN` in the Data/Security Impact section. Fill in before publishing.
2. **Action item 8 is live work, not a follow-up.** #695 is still not in production as of 2026-09-10 20:25 UTC — tracked in [#726](https://github.com/ilv78/Art-World-Hub/issues/726).
3. Alert history before 2026-08-10 could not be confirmed — GitHub run retention no longer reaches it. The ≥13 alert count is a floor, not a total.
4. Severity is assessed **P1** on the basis of a 61-day undeployed security fix and a frozen delivery pipeline, despite zero user-visible impact. Downgrade to P2 if the pipeline-only framing is preferred.
5. Action items 1, 2 and 8 are proposed as P0 because the two prior incidents of this class were each closed by fixing the CVEs alone.

---

## Glossary

| Term | Definition |
|------|------------|
| Trivy | Container image vulnerability scanner run in CI. Compares packages found in the image against a continuously-updated advisory database |
| Advisory database drift | New CVEs entering the scanner's database, turning a previously-green scan red with no change to the scanned artifact |
| `.trivyignore.yaml` | Policy file suppressing specific CVEs. Project convention requires a `statement` (why it is not reachable) and an `expired_at` date on every entry |
| Vendored content | Code shipped inside the image that the project did not choose and cannot upgrade — here, the npm CLI bundled in the Node base image, and esbuild's Go binary bundled inside drizzle-kit |
| Path-scoped suppression | A `.trivyignore.yaml` entry limited to one file path, so the CVE stays reported elsewhere in the image |
| `Gate` | The aggregate CI status check that other checks feed into |
| MCP endpoint | Model Context Protocol server at `/mcp`, exposing project resources and tools to AI clients |
| `ignore-unfixed` | Trivy flag suppressing findings with no available fix, so only actionable findings are reported |

---

## Appendix

- Issue: [#710 — CI: main red since 2026-07-13, Trivy scan blocks all staging deploys](https://github.com/ilv78/Art-World-Hub/issues/710)
- Fix: [#725 — patch libgnutls30 in-image, suppress bundled CVE remainder](https://github.com/ilv78/Art-World-Hub/pull/725)
- Prior incidents of the same class: [#631](https://github.com/ilv78/Art-World-Hub/issues/631), [#670](https://github.com/ilv78/Art-World-Hub/issues/670)
- Related open issues: [#641 (branch protection)](https://github.com/ilv78/Art-World-Hub/issues/641), [#533 (scheduled scans, persistent alerts)](https://github.com/ilv78/Art-World-Hub/issues/533), [#629 (base-image rebuild — superseded by #725)](https://github.com/ilv78/Art-World-Hub/issues/629)
- Undeployed security fix: [#695](https://github.com/ilv78/Art-World-Hub/pull/695) closing [#681](https://github.com/ilv78/Art-World-Hub/issues/681)
- Last green run before the incident: `29105455266` (2026-07-10 15:55 UTC)
- First failing run: `29166776469` (2026-07-11 20:17 UTC)
