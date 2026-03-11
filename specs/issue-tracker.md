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
4. **Then follow** the development workflow in `specs/development-procedures.md` (branch → code → test → PR → merge → deploy)

This ensures traceability, keeps the team aligned, and prevents work from getting lost.

---

## Active Issues

| # | Title | Priority | Category | Status | Branch | Notes |
|---|-------|----------|----------|--------|--------|-------|
| 4 | Bug hunter | medium | devops | Open | — | Automated bug detection/testing |
| 5 | Documentor | medium | documentation, devops | Open | — | Documentation tooling |
| 6 | Email login | medium | enhancement | Open | — | Add email/password auth flow |
| 7 | Role gallery curator | medium | feature | Open | — | Curator role for gallery management |
| 20 | CI/CD pipeline e2e test | high | devops | In Progress | `test/issue-20-cicd-e2e-test` | Testing full pipeline + Telegram notifications |

## Completed Issues

| # | Title | Priority | Category | Completed | Branch | PR |
|---|-------|----------|----------|-----------|--------|----|
| 1 | A new color palette | — | — | 2026-03-11 | `feature/issue-1-color-palettes` | #2 |
| 3 | Store images | high | feature | 2026-03-11 | `feature/issue-3-store-images` | #10 |
| 11 | Fix Google OAuth login | high | bug | 2026-03-11 | `fix/issue-11-google-oauth` | #13 #15 |
| 17 | Deduplicate upload code | low | refactor | 2026-03-11 | `refactor/issue-17-deduplicate-upload-code` | #18 |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial version — catalogued all existing GitHub issues |
| 2026-03-11 | Moved #3, #11 to Completed. Added #17 (upload code refactor). |
