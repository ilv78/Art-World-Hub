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
| 8 | Create admin section | high | feature | Open | — | Admin panel for platform management |
| 32 | Correct names in museum gallery | medium | bug | Open | — | Artist room names incorrect |
| 36 | Role securitas - in CI/CD | high | devops | In Progress | — | Parent: spec at `specs/SECURITY_AGENT.md`. Sub-issue #55 done. Audit completed → issue #77 (4×P0, 6×P1, 7×P2). |
| 76 | Upgrade Vite 7→8 | high | bug | Open | — | Dependabot PR #70 closed (major) |
| 97 | Post-mortem: Issue #8 admin section pushed directly to main | critical | bug | Open | — | Parent postmortem issue. Action items: #100 (done), #101 (done), #102 (in progress). |

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

| 89 | Auto-update issue tracker on issue/bug closure | low | devops | 2026-03-13 | `feature/issue-89-auto-issue-tracker` | #90 |
| 12 | correct artist profile picture | low | bug | 2026-03-13 | `feature/issue-12-profile-picture-upload` | #91 |
| 35 | Release workflow | medium | enhancement | 2026-03-13 | `feature/issue-35-release-management` | #96 |
| 100 | Enable branch protection on main | high | devops | 2026-03-13 | — | Enabled via GitHub API (postmortem action item #1) |
| 101 | Add pre-push hook to block direct pushes to main | high | devops | 2026-03-13 | `feature/issue-101-pre-push-hook` | #105 |
| 102 | Document postmortem in issue tracker and README index | low | documentation | 2026-03-14 | `docs/issue-102-postmortem-tracker` | — |
| 4 | Bug hunter | medium | devops | 2026-03-17 | `fix/issue-25-gallery-slot-count` | #30 |
| 75 | Upgrade recharts from 2.x to 3.x | high | bug | 2026-03-17 | `fix/issue-75-recharts-upgrade` | #159 |
| 7 | Role gallery curator | medium | feature | 2026-03-18 | `feature/issue-42-backfill-docs` | #48 |
| 172 | Mobile adaptation | critical | bug | 2026-03-20 | `fix/issue-172-mobile-adaptation` | #173 |
| 177 | Fix high-severity npm audit vulnerability in flatted | critical | bug | 2026-03-20 | `fix/issue-177-flatted-audit` | #178 |
| 171 | Order cannot be submited | — | bug | 2026-03-20 | `fix/issue-171-order-submission` | #176 |
| 170 | Store system - umbrella | high | enhancement | 2026-03-20 | `dependabot/github_actions/appleboy/scp-action-1.0.0` | #58 |
| 14 | multiple gallery templates | low | enhancement | 2026-03-23 | `feature/issue-98-postmortem-workflow` | #99 |
| 73 | Upgrade Node.js from 20 to 25 in Docker image | high | bug | 2026-03-23 | `upgrade/node-25` | #201 |
| 206 | Skip Docker build and staging deploy for docs-only changes | — | devops | 2026-03-23 | `fix/issue-206-skip-docs-deploy` | #207 |
| 74 | Upgrade react-resizable-panels from 2.x to 4.x | high | bug | 2026-03-23 | `refactor/issue-53-simplify-auth-email` | #54 |
| 181 | Remove seed functionality from codebase | low | bug | 2026-03-23 | `fix/issue-181-remove-seed` | #214 |
| 197 | Migrate react-day-picker v8 → v9 | high | enhancement | 2026-03-23 | `feature/issue-197-day-picker-v9` | #216 |
| 77 | 🔴 Security Audit — Critical findings require immediate action | medium | devops | 2026-03-23 | `fix/issue-79-lock-order-endpoints` | #83 |
| 161 | museum overview | low | bug | 2026-03-23 | — | — |
| 169 | Artworks not visible on click | high | bug | 2026-03-23 | `fix/issue-80-81-mcp-auth-ssrf` | #84 |
| 198 | Migrate Zod v3 → v4 | high | enhancement | 2026-03-24 | `upgrade/zod-v4` | #224 |
| 196 | Migrate Tailwind CSS v3 → v4 | high | enhancement | 2026-03-24 | `upgrade/tailwind-v4` | #227 |
| 164 | We will need a curator profile editor | high | feature | 2026-03-24 | `feature/issue-164-curator-profile-editor` | #230 |
| 235 | v3: CI pipeline + preview deploy for redesign/v3 branch | — | devops | 2026-03-24 | `feature/issue-235-preview-deploy` | #245 |
| 236 | v3: Split layout shells (public + dashboard) | — | feature, ui/ux | 2026-03-24 | `feature/issue-236-split-layout-shells` | #247 |
| 249 | CI/CD: auto-merge passing PRs and auto-deploy on release | high | devops | 2026-03-25 | `feature/ci-automerge-autodeploy` | #250 |
| 237 | v3: Top navigation bar | — | feature, ui/ux | 2026-03-25 | `feature/issue-237-top-nav` | #252 |
| 238 | v3: Footer component | — | feature, ui/ux | 2026-03-25 | `worktree-v3-238` | #255 |
| 239 | v3: Home page redesign | — | feature, ui/ux | 2026-03-26 | `feature/issue-239-home-page-redesign` | #258 |
| 240 | v3: Gallery page full-width 3D + immersive mode | — | feature, ui/ux | 2026-03-26 | `feature/issue-239-home-page-redesign` | #260 |
| 241 | v3: Store page grid improvements | — | enhancement, ui/ux | 2026-03-26 | — | — |
| 242 | v3: Other page improvements (artists, exhibitions, blog) | — | enhancement, ui/ux | 2026-03-26 | `feature/issue-242-page-improvements` | #263 |
| 243 | v3: Mobile navigation | — | enhancement, ui/ux | 2026-03-26 | `feature/issue-243-mobile-nav` | #265 |
| 253 | v3: Privacy Policy & Terms of Service pages | low | feature, ui/ux | 2026-03-26 | `feature/issue-253-legal-pages` | #267 |
| 233 | Artworks to be featured in the first page | high | enhancement | 2026-03-27 | — | — |
| 254 | v3: Newsletter signup functionality | medium | feature | 2026-03-27 | `feature/issue-254-newsletter` | #270 |
| 272 | v3 - Remove referrals at Romania in documents | — | — | 2026-03-27 | `feature/issue-272-remove-romania-refs` | #274 |
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
| 2026-03-13 | Auto-closed #89 (Auto-update issue tracker on issue/bug closure). Moved from Active to Completed. PR #90. |
| 2026-03-13 | Auto-closed #12 (correct artist profile picture). Moved from Active to Completed. PR #91. |
| 2026-03-13 | Auto-closed #35 (Release workflow). Moved from Active to Completed. PR #96. |
| 2026-03-14 | Added postmortem-related issues: #97 (Active), #100, #101, #102 (Completed). Postmortem action items from 2026-03-13 incident. |
| 2026-03-17 | Auto-closed #4 (Bug hunter). Moved from Active to Completed. PR #30. |
| 2026-03-17 | Auto-closed #75 (Upgrade recharts from 2.x to 3.x). Moved from Active to Completed. PR #159. |
| 2026-03-18 | Auto-closed #7 (Role gallery curator). Moved from Active to Completed. PR #48. |
| 2026-03-20 | Auto-closed #172 (Mobile adaptation). Added to Completed. PR #173. |
| 2026-03-20 | Auto-closed #177 (Fix high-severity npm audit vulnerability in flatted). Added to Completed. PR #178. |
| 2026-03-20 | Auto-closed #171 (Order cannot be submited). Added to Completed. PR #176. |
| 2026-03-20 | Auto-closed #170 (Store system - umbrella). Added to Completed. PR #58. |
| 2026-03-23 | Auto-closed #14 (multiple gallery templates). Moved from Active to Completed. PR #99. |
| 2026-03-23 | Auto-closed #73 (Upgrade Node.js from 20 to 25 in Docker image). Moved from Active to Completed. PR #201. |
| 2026-03-23 | Auto-closed #206 (Skip Docker build and staging deploy for docs-only changes). Added to Completed. PR #207. |
| 2026-03-23 | Auto-closed #74 (Upgrade react-resizable-panels from 2.x to 4.x). Moved from Active to Completed. PR #54. |
| 2026-03-23 | Auto-closed #181 (Remove seed functionality from codebase). Added to Completed. PR #214. |
| 2026-03-23 | Auto-closed #197 (Migrate react-day-picker v8 → v9). Added to Completed. PR #216. |
| 2026-03-23 | #77 P2 security hardening started — pre-commit gitleaks hook, write endpoint rate limiting, Trivy gate before staging deploy. Branch `fix/issue-77-p2-security-hardening`. |
| 2026-03-23 | Auto-closed #77 (🔴 Security Audit — Critical findings require immediate action). Moved from Active to Completed. PR #83. |
| 2026-03-23 | Auto-closed #161 (museum overview). Added to Completed. |
| 2026-03-23 | Auto-closed #169 (Artworks not visible on click). Added to Completed. PR #84. |
| 2026-03-24 | Auto-closed #198 (Migrate Zod v3 → v4). Added to Completed. PR #224. |
| 2026-03-24 | Auto-closed #196 (Migrate Tailwind CSS v3 → v4). Added to Completed. PR #227. |
| 2026-03-24 | Auto-closed #164 (We will need a curator profile editor). Added to Completed. PR #230. |
| 2026-03-24 | Auto-closed #235 (v3: CI pipeline + preview deploy for redesign/v3 branch). Added to Completed. PR #245. |
| 2026-03-24 | Auto-closed #236 (v3: Split layout shells (public + dashboard)). Added to Completed. PR #247. |
| 2026-03-25 | Auto-closed #249 (CI/CD: auto-merge passing PRs and auto-deploy on release). Added to Completed. PR #250. |
| 2026-03-25 | Auto-closed #237 (v3: Top navigation bar). Added to Completed. PR #252. |
| 2026-03-25 | Auto-closed #238 (v3: Footer component). Added to Completed. PR #255. |
| 2026-03-26 | Auto-closed #239 (v3: Home page redesign). Added to Completed. PR #258. |
| 2026-03-26 | Auto-closed #240 (v3: Gallery page full-width 3D + immersive mode). Added to Completed. PR #260. |
| 2026-03-26 | Auto-closed #241 (v3: Store page grid improvements). Added to Completed. |
| 2026-03-26 | Auto-closed #242 (v3: Other page improvements (artists, exhibitions, blog)). Added to Completed. PR #263. |
| 2026-03-26 | Auto-closed #243 (v3: Mobile navigation). Added to Completed. PR #265. |
| 2026-03-26 | Auto-closed #253 (v3: Privacy Policy & Terms of Service pages). Added to Completed. PR #267. |
| 2026-03-27 | Auto-closed #233 (Artworks to be featured in the first page). Added to Completed. |
| 2026-03-27 | Auto-closed #254 (v3: Newsletter signup functionality). Added to Completed. PR #270. |
| 2026-03-27 | Auto-closed #272 (v3 - Remove referrals at Romania in documents). Added to Completed. PR #274. |
