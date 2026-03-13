# ArtVerse — Issue & Feature Tracker

This file tracks all work items for the project. Every feature, bug fix, or enhancement should have a corresponding GitHub issue **before** work begins.

---

## Workflow Reminder

**All work must start from a GitHub issue.** If a task is requested without an existing issue:

1. **Stop** — do not start coding
2. **Recommend** creating a GitHub issue first:
   ```bash
   gh issue create --title "Short title" --body "Description" --label "feature"
   ```
3. **Add labels** — use priority (`priority: high`, `priority: medium`, `priority: low`, `priority: critical`) and category (`bug`, `feature`, `enhancement`, `ui/ux`, `refactor`, `devops`, `documentation`)
4. **Then follow** the development workflow in `specs/workflows/LOCAL-DEV.md` (branch → code → test → PR → merge → deploy)

This ensures traceability, keeps the team aligned, and prevents work from getting lost.

---

## Active Issues

| # | Title | Priority | Category | Status | Branch | Notes |
|---|-------|----------|----------|--------|--------|-------|
| 4 | Bug hunter | medium | devops | Open | — | Automated bug detection/testing |
| 7 | Role gallery curator | medium | feature | Open | — | Curator role for gallery management |
| 8 | Create admin section | high | feature | Open | — | Admin panel for platform management |
| 12 | Correct artist profile picture | low | bug | Open | — | Profile picture display issue |
| 14 | Multiple gallery templates | low | enhancement | Open | — | Support different gallery room layouts |
| 32 | Correct names in museum gallery | medium | bug | Open | — | Artist room names incorrect |
| 36 | Role securitas - in CI/CD | high | devops | In Progress | — | Parent: spec at `specs/SECURITY_AGENT.md`. Sub-issue #55 done. Audit completed → issue #77 (4×P0, 6×P1, 7×P2). |
| 73 | Upgrade Node.js 20→25 | high | bug | Open | — | Dependabot PR #57 closed (major) |
| 77 | Security Audit — Critical findings | critical | devops | In Progress | — | Parent. All 4 P0s done (PRs #82–#84), all 6 P1s done (PR #85). 6 P2s remaining (1 P2 was done in P1 batch). |
| 74 | Upgrade react-resizable-panels 2→4 | high | bug | Open | — | Dependabot PR #68 closed (major) |
| 75 | Upgrade recharts 2→3 | high | bug | Open | — | Dependabot PR #69 closed (major) |
| 76 | Upgrade Vite 7→8 | high | bug | Open | — | Dependabot PR #70 closed (major) |

## Completed Issues

| # | Title | Priority | Category | Completed | Branch | PR |
|---|-------|----------|----------|-----------|--------|----|
| 1 | A new color palette | — | — | 2026-03-11 | `feature/issue-1-color-palettes` | #2 |
| 3 | Store images | high | feature | 2026-03-11 | `feature/issue-3-store-images` | #10 |
| 9 | Classic view gallery arrows | high | bug | 2026-03-11 | `fix/issue-9-classic-gallery-arrows` | #31 |
| 11 | Fix Google OAuth login | high | bug | 2026-03-11 | `fix/issue-11-google-oauth` | #13 #15 |
| 17 | Deduplicate upload code | low | refactor | 2026-03-11 | `refactor/issue-17-deduplicate-upload-code` | #18 |
| 19 | /blog route SPA 404 | high | bug | 2026-03-11 | `fix/issue-19-blog-route` | #24 |
| 20 | CI/CD pipeline e2e test | high | devops | 2026-03-11 | `test/issue-20-cicd-e2e-test` | #21 |
| 22 | Add README.md | — | documentation | 2026-03-11 | `feature/issue-22-readme` | #23 |
| 25 | Missing artwork in gallery | high | bug | 2026-03-11 | `fix/issue-25-gallery-slot-count` | #30 |
| 26 | Telegram announcing format | low | enhancement | 2026-03-11 | `enhancement/issue-26-telegram-format` | #27 |
| 28 | Galleries not ok in museum | high | bug | 2026-03-11 | `fix/issue-28-museum-gallery-stale-layout` | #29 |
| 6 | Email login | medium | enhancement | 2026-03-12 | `feature/issue-6-email-login` | #33 |
| 34 | Email signup magic link not sent | high | bug | 2026-03-12 | `fix/issue-34-magic-link-emails` | #38 |
| 40 | Restructure specs/ directory | medium | documentation | 2026-03-12 | `feature/issue-40-restructure-specs` | #43 |
| 41 | Create doc agent GitHub Actions workflow | medium | documentation, devops | 2026-03-12 | `feature/issue-41-doc-agent-workflow` | #44 #45 |
| 42 | Backfill documentation | medium | documentation | 2026-03-12 | `feature/issue-42-backfill-docs` | #48 |
| 5 | Documentor (parent) | medium | documentation, devops | 2026-03-12 | — | Sub-issues #40, #41, #42 |
| 53 | Refactor: consolidate duplicated auth/email/frontend code | medium | refactor | 2026-03-12 | `refactor/issue-53-simplify-auth-email` | #54 |
| 55 | Implement security CI/CD pipeline | high | devops | 2026-03-12 | `feature/issue-55-security-pipeline` | #56 |
| 78 | Add auth to 9 unprotected write endpoints | critical | bug | 2026-03-13 | `fix/issue-78-auth-write-endpoints` | #82 |
| 79 | Lock down order endpoints (PII exposure) | critical | bug | 2026-03-13 | `fix/issue-79-lock-order-endpoints` | #83 |
| 80 | Add auth to MCP server endpoint | critical | bug | 2026-03-13 | `fix/issue-80-81-mcp-auth-ssrf` | #84 |
| 81 | Fix SSRF in image proxy endpoint | critical | bug | 2026-03-13 | `fix/issue-80-81-mcp-auth-ssrf` | #84 |
| 37 | Resend not sending except to owner email | high | bug | 2026-03-13 | `fix/issue-37-resend-sender` | #88 |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial version — catalogued all existing GitHub issues |
| 2026-03-11 | Moved #3, #11 to Completed. Added #17 (upload code refactor). |
| 2026-03-11 | Bulk update: completed #9, #19, #20, #22, #25, #26, #28. Added open #8, #12, #14, #32. |
| 2026-03-12 | Moved #6 (email login) to Completed — deployed to production. |
| 2026-03-12 | Added #34 (email signup magic link not sent) — high priority bug. |
| 2026-03-12 | Moved #34 to Completed (PR #38). Added #40, #41, #42 (doc agent sub-issues of #5). |
| 2026-03-12 | Moved #40 to Completed (PR #43), #41 to Completed (PR #44 + fix PR #45). |
| 2026-03-12 | Moved #42 to Completed (PR #48). Moved #5 (parent) to Completed — all sub-issues done. |
| 2026-03-12 | Added #53 (refactor auth/email/frontend) to Completed (PR #54). |
| 2026-03-12 | Added #36 (securitas parent) and #55 (security pipeline sub-issue) to Active — PR #56. |
| 2026-03-12 | Moved #55 to Completed (PR #56 merged). #36 remains Active (audit pending). |
| 2026-03-12 | Added #73, #74, #75, #76 (major dep upgrades from closed Dependabot PRs). Uploaded security agent spec. |
| 2026-03-12 | Security audit completed. Created #77 (critical — 4 P0s, 6 P1s, 7 P2s). Updated #36 status. |
| 2026-03-13 | All 4 P0s completed: #78 (PR #82), #79 (PR #83), #80+#81 (PR #84). Deployed to staging. |
| 2026-03-13 | All 6 P1s completed (PR #85): Helmet headers, email HTML escaping, Zod PATCH validation, magic byte upload validation, Actions SHA pinning, shell injection fixes, DB_MIGRATION_MODE→migrate. Deployed to production (`f80196af`). 6 P2s remaining. |
| 2026-03-13 | Added #86 (update specs to reflect security fixes). Updated 8 spec files: CI-CD, OVERVIEW, DEPLOYMENT, DECISION-LOG, authentication, email-login, image-upload, mcp-server. |
| 2026-03-13 | #37 completed (PR #88) — changed Resend sender from sandbox to gallery@idata.ro. Deployed to production. |
