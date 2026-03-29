---
title: "Production changelog and version API show v2.7.0 instead of deployed v3.0.0"
date: 2026-03-29
severity: P3
status: Draft
trigger: "Deploy or config push causing degradation — user-visible content (changelog, version) does not match deployed release"
distribution: public
owner: "[developer]"
participants: "[developer], [AI assistant]"
components: "CI/CD pipeline, build process"
incident_state_doc: "Conversation context during v3.0.0 release deployment"
---

# Postmortem: Production changelog and version API show v2.7.0 instead of deployed v3.0.0

> **Status:** Draft — not yet reviewed
> **Severity:** P3
> **Distribution:** Public
> **Incident date:** 2026-03-29 ~00:15 UTC
> **Published:** 2026-03-29

---

## Executive Summary

After deploying v3.0.0 (the Vernis9 rebrand) to production, the `/changelog` page and `/api/version` endpoint continued to show v2.7.0 and the old "ArtVerse" branding. The root cause was a sequencing gap in the release process: the CHANGELOG.md was updated *after* the Docker image was built and tagged, so the v3.0.0 image was baked with the stale v2.7.0 changelog. The most important preventive action is to ensure CHANGELOG.md is updated *before* tagging a release, not after.

---

## Impact

### User Impact

| Metric | Value |
|--------|-------|
| Duration | Ongoing — until a rebuild or redeploy with updated CHANGELOG.md |
| Users / requests affected | All users visiting `/changelog` or consuming `/api/version` (estimate: low traffic, informational endpoint) |
| Features / endpoints affected | `/changelog` page, `/api/version` API |
| Error rate during incident | 0% errors — content is served successfully, but is stale/incorrect |

### System Impact

- [ ] API availability degraded
- [ ] Database access affected
- [ ] 3D museum experience impacted
- [ ] Storage / asset retrieval broken
- [ ] CI/CD pipeline affected
- [ ] Security: credentials or data potentially exposed
- [x] Other: User-facing informational content is incorrect (wrong version, old branding)

### Data / Security Impact

N/A — no data loss, no credential exposure.

### Revenue / Business Impact

Minimal — informational page only. However, the changelog showing "ArtVerse" instead of "Vernis9" undermines the rebrand for any user who visits the page.

---

## What Changed Last

| Change | Type | Timestamp (UTC) | Notes |
|--------|------|-----------------|-------|
| Deploy v3.0.0 to production (commit `bbd3e01`) | deploy | 2026-03-29 ~00:06 | Docker image built from this commit, which did NOT include the v3.0.0 changelog entry |
| CHANGELOG.md updated via PR [#291](https://github.com/ilv78/Art-World-Hub/pull/291) | code | 2026-03-29 ~00:15 | Merged to `main` AFTER the Docker image was already built and deployed |

The changelog update was a reaction to noticing it was missing, but by then the Docker image was already baked and deployed.

---

## Timeline

| Time (UTC) | Event |
|------------|-------|
| 2026-03-28 23:50 | v3.0.0 tag created on commit `bbd3e01` |
| 2026-03-28 23:51 | GitHub release v3.0.0 published |
| 2026-03-29 00:00 | Production deploy triggered with image `bbd3e01` |
| 2026-03-29 00:06 | Production deploy completed, v3.0.0 live |
| 2026-03-29 00:10 | Developer noticed CHANGELOG.md was not updated |
| 2026-03-29 00:12 | CHANGELOG.md update committed on branch `fix/issue-285-changelog-v3` |
| 2026-03-29 00:15 | PR [#291](https://github.com/ilv78/Art-World-Hub/pull/291) auto-merged to `main` |
| 2026-03-29 00:40 | During domain verification, `/api/version` confirmed returning `v2.7.0` |
| 2026-03-29 01:00 | Root cause identified — image baked before changelog update |

---

## Root Causes and Trigger

### What Changed Last (Summary)

The v3.0.0 Docker image was built from the merge commit `bbd3e01`, which contained the old CHANGELOG.md (last entry: v2.7.0). The changelog was updated in a separate PR (#291) merged after the image was already built and deployed.

### Trigger

The `/changelog` page and `/api/version` endpoint read CHANGELOG.md from the Docker image filesystem at server startup (cached in memory). Since the image was built with the pre-update CHANGELOG.md, users see v2.7.0.

### Root Cause Analysis

```
Failure mode 1: CHANGELOG.md not updated before release tagging
  Why? → The changelog update was treated as a follow-up task after the release, not a prerequisite
  Why? → The release workflow has no step requiring CHANGELOG.md to be current before tagging
  Why? → No automated check or CI gate validates that CHANGELOG.md contains an entry for the version being released

Contributing factor: CHANGELOG.md is baked into the Docker image at build time
  Why? → The Dockerfile copies CHANGELOG.md into the final image (line 26)
  Why? → The server reads it at startup and caches it — there is no runtime refresh mechanism
  Why? → This design means the changelog is frozen at build time, creating a coupling between build order and content correctness
```

### Why Wasn't This Caught Earlier?

1. **No CI validation** — there is no check that CHANGELOG.md contains an entry matching the release version tag.
2. **No staging validation** — the changelog was not verified on staging before production deploy.
3. **No smoke test** — the production deploy smoke test checks `/health` but not `/api/version` or `/api/changelog`.
4. **Manual process** — updating the changelog is a manual step with no enforcement.

---

## Detection

| Field | Value |
|-------|-------|
| Detection method | Manual observation — developer noticed while verifying production |
| Time from failure start to detection | ~35 minutes (from deploy at 00:06 to discovery at ~00:40) |
| Alert that fired (if any) | None |
| Why wasn't it caught sooner? | No monitoring or smoke test validates changelog/version content |

---

## Response and Mitigation

### Immediate Mitigation

The CHANGELOG.md was updated via PR [#291](https://github.com/ilv78/Art-World-Hub/pull/291) on `main`, but this does NOT fix production — the running Docker image still contains the old file. A rebuild and redeploy is needed.

**Was rollback triggered?** No — not applicable. The app is functional; only the changelog content is stale.

### Full Resolution

To fully resolve: rebuild the Docker image from current `main` (which includes the updated CHANGELOG.md) and redeploy to production.

### What Slowed Recovery

- The realization that CHANGELOG.md is baked at build time, not read from a live file or API
- The multi-step deploy process requires a new image build → push → deploy cycle for a content-only fix

---

## Credential and Secret Rotation

N/A — no security incident.

---

## Lessons Learned

### What Went Well

- The rebrand itself (code changes) deployed correctly — all UI, emails, MCP references show "Vernis9"
- The issue was caught during the same session, within 35 minutes
- DNS, nginx, SSL setup all worked flawlessly

### What Went Poorly

- CHANGELOG.md was not part of the pre-release checklist
- The version API returned stale data with no way to detect this automatically
- Release workflow lacks a validation gate for changelog currency

### Where We Got Lucky

- The changelog page is low-traffic and informational — if this had been a critical API returning wrong version info for client compatibility checks, the impact would have been much higher
- The old branding ("ArtVerse") showing on the changelog page only partially undermines the rebrand — most users will never visit `/changelog`

---

## Action Items

| # | Action Item | Type | Priority | Owner | Issue |
|---|-------------|------|----------|-------|-------|
| 1 | Add CI check that validates CHANGELOG.md contains an entry matching the version tag before release finalization | prevent | P1 | [developer] | [#295](https://github.com/ilv78/Art-World-Hub/issues/295) |
| 2 | Add `/api/version` and `/api/changelog` content check to production deploy smoke test — verify version matches deployed tag | detect | P1 | [developer] | [#296](https://github.com/ilv78/Art-World-Hub/issues/296) |
| 3 | Rebuild and redeploy production with current `main` to fix the stale changelog | repair | P0 | [developer] | [#297](https://github.com/ilv78/Art-World-Hub/issues/297) |
| 4 | Update release workflow documentation to include "update CHANGELOG.md" as a prerequisite step before tagging | document | P2 | [developer] | [#298](https://github.com/ilv78/Art-World-Hub/issues/298) |

---

## Security-Specific Action Items

N/A

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
- [x] A reader unfamiliar with the project could understand what happened
- [x] File saved to `docs/postmortems/2026-03-29-changelog-version-mismatch.md`

---

## Glossary

| Term | Definition |
|------|------------|
| CHANGELOG.md | Markdown file tracking all version changes, baked into the Docker image and served via `/api/changelog` |
| `/api/version` | API endpoint returning the current version string, parsed from CHANGELOG.md at server startup |
| Docker image | Immutable container image built during CI, deployed to production — content is frozen at build time |
| Smoke test | Automated health check run after deploy to verify the service is functional |
| GHCR | GitHub Container Registry — where Docker images are stored |

---

## Appendix

- CHANGELOG.md update PR: [#291](https://github.com/ilv78/Art-World-Hub/pull/291)
- v3.0.0 release: [v3.0.0](https://github.com/ilv78/Art-World-Hub/releases/tag/v3.0.0)
- Production deploy commit: `bbd3e01ea0000dcb32ca5f623383d6a91647d96e`
- Production `/api/version` output at time of detection: `{"version":"v2.7.0"}`
- Production `/api/changelog` first line at time of detection: `All notable changes to [ArtVerse](...)`
