# Changelog

All notable changes to [ArtVerse](https://github.com/ilv78/Art-World-Hub) will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/). See `specs/workflows/VERSIONING.md` for the full versioning policy.

Deployment tags (`release-{run_number}`) are created automatically on every push to main. Semantic version tags (`vX.Y.Z`) mark meaningful milestones.

## [Unreleased]

_Nothing yet — all recent work included in v2.3.0 below._

## [2.3.0] - 2026-03-18

### Added
- Role gallery curator ([#7](https://github.com/ilv78/Art-World-Hub/issues/7))

### Fixed
- Upgrade recharts from 2.x to 3.x ([#75](https://github.com/ilv78/Art-World-Hub/issues/75))
- in the museum gallery correct names ([#32](https://github.com/ilv78/Art-World-Hub/issues/32))

## [2.2.1] - 2026-03-17

### Fixed
- in the museum gallery correct names ([#32](https://github.com/ilv78/Art-World-Hub/issues/32))

## [2.2.0] - 2026-03-15

### Added
- Add in the website details about changelog / release number ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- Logging infrastructure ([#39](https://github.com/ilv78/Art-World-Hub/issues/39))

### Fixed
- Prices adjustments in UI. ([#130](https://github.com/ilv78/Art-World-Hub/issues/130))
- Artwork missing in museum gallery ([#128](https://github.com/ilv78/Art-World-Hub/issues/128))
- users vs artists in ArtVerse ([#122](https://github.com/ilv78/Art-World-Hub/issues/122))
- Remove GitHub authentication inside ArtVerse ([#95](https://github.com/ilv78/Art-World-Hub/issues/95))

### Added
- Release version and changelog link in homepage footer ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- Public `/changelog` page rendering full changelog with markdown formatting ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- `GET /api/version` and `GET /api/changelog` endpoints ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
### Fixed
- Removed stale GitHub authentication reference from artist dashboard ([#95](https://github.com/ilv78/Art-World-Hub/issues/95))

## [2.1.0] - 2026-03-14

### Added
- Automated release workflow with label-based version detection ([#110](https://github.com/ilv78/Art-World-Hub/issues/110))
- Create admin section ([#8](https://github.com/ilv78/Art-World-Hub/issues/8))
- Email login: magic link signup (Resend) + email/password signin ([#6](https://github.com/ilv78/Art-World-Hub/issues/6))
- Profile picture upload for artists ([#12](https://github.com/ilv78/Art-World-Hub/issues/12))
- Release management system: Docker image tagging, health checks, smoke tests, git release tags ([#35](https://github.com/ilv78/Art-World-Hub/issues/35))
- Security CI/CD pipeline: gitleaks, npm audit, Semgrep, hadolint, Trivy, custom checks ([#55](https://github.com/ilv78/Art-World-Hub/issues/55))
- Auto-update issue tracker on issue closure ([#89](https://github.com/ilv78/Art-World-Hub/issues/89))
- Pre-push hook to block direct pushes to main ([#101](https://github.com/ilv78/Art-World-Hub/issues/101))
- Postmortem workflow and template ([#98](https://github.com/ilv78/Art-World-Hub/issues/98))
- Documentation agent spec, backfill, and restructured specs directory ([#5](https://github.com/ilv78/Art-World-Hub/issues/5), [#40](https://github.com/ilv78/Art-World-Hub/issues/40), [#41](https://github.com/ilv78/Art-World-Hub/issues/41), [#42](https://github.com/ilv78/Art-World-Hub/issues/42))

### Fixed
- CI/CD - minor failures ([#104](https://github.com/ilv78/Art-World-Hub/issues/104))
- Magic link emails not being sent ([#34](https://github.com/ilv78/Art-World-Hub/issues/34))
- Resend sender address — changed from sandbox to gallery@idata.ro ([#37](https://github.com/ilv78/Art-World-Hub/issues/37))

### Security
- Auth added to 9 unprotected write endpoints ([#78](https://github.com/ilv78/Art-World-Hub/issues/78))
- Order endpoints locked down to prevent PII exposure ([#79](https://github.com/ilv78/Art-World-Hub/issues/79))
- MCP server endpoint secured with authentication ([#80](https://github.com/ilv78/Art-World-Hub/issues/80))
- SSRF vulnerability fixed in image proxy endpoint ([#81](https://github.com/ilv78/Art-World-Hub/issues/81))
- P1 hardening: Helmet headers, email HTML escaping, Zod PATCH validation, magic byte upload validation, Actions SHA pinning, shell injection fixes ([#77](https://github.com/ilv78/Art-World-Hub/issues/77))

### Changed
- Role securitas - in CI/CD ([#36](https://github.com/ilv78/Art-World-Hub/issues/36))
- Refactored auth, email, and frontend code to consolidate duplications ([#53](https://github.com/ilv78/Art-World-Hub/issues/53))
- Google OAuth moved from `/api/login` to `/api/login/google`
- Resend email integration refactored to use `RESEND_API_KEY` env var

## [2.0.0] - 2026-03-11

### Added
- Full CI/CD pipeline: lint, type check, tests, build, Docker image, staging deploy ([#20](https://github.com/ilv78/Art-World-Hub/issues/20))
- Vitest test infrastructure with storage and route tests
- PostgreSQL migrations with Drizzle Kit (dual-mode: push for staging, migrate for production)
- Production deploy workflow with rollback capability
- Rollback workflow (one-click)
- Telegram notifications on deploy/rollback events
- Architecture specification document
- Development procedures and CI/CD spec

### Fixed
- Classic view gallery navigation arrows ([#9](https://github.com/ilv78/Art-World-Hub/issues/9))
- Google OAuth login flow ([#11](https://github.com/ilv78/Art-World-Hub/issues/11))
- Blog route SPA 404 errors ([#19](https://github.com/ilv78/Art-World-Hub/issues/19))
- Missing artworks in gallery display ([#25](https://github.com/ilv78/Art-World-Hub/issues/25))
- Museum gallery stale layout data ([#28](https://github.com/ilv78/Art-World-Hub/issues/28))

### Changed
- Color palette updated ([#1](https://github.com/ilv78/Art-World-Hub/issues/1))
- Image storage refactored ([#3](https://github.com/ilv78/Art-World-Hub/issues/3))
- Upload code deduplicated ([#17](https://github.com/ilv78/Art-World-Hub/issues/17))
- Telegram notification format improved ([#26](https://github.com/ilv78/Art-World-Hub/issues/26))

## [1.3.0] - 2026-02-24

### Changed
- Published app update

## [1.2.1] - 2026-02-24

### Added
- Docker deployment
- Google OIDC authentication
- Safer user upsert logic

## [1.2.0] - 2026-02-22

### Added
- Initial published application
