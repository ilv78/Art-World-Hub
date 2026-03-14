# Release Management — Feature Spec

## Overview

Structured release management system for ArtVerse that adds Docker image traceability, health-gated deploys, automated rollback, and git release identity.

## Components

### 1. Docker Image Tagging

Every image pushed to GHCR gets three tags:
- `latest` — always points to most recent build
- `{commit_sha}` — full git traceability
- `{run_number}` — human-readable monotonic integer for rollbacks

### 2. Health Check Endpoint

**Route:** `GET /health`

- Returns `200 { status: "ok", version, timestamp }` when DB is reachable
- Returns `503 { status: "error", message, timestamp }` when DB is unreachable
- Uses Drizzle ORM `db.execute(sql\`SELECT 1\`)` for lightweight DB probe
- `APP_VERSION` env var injected via Docker build arg (`github.run_number`)

**Files:**
- `server/routes/health.ts` — Express router
- `server/index.ts` — registered before auth/session middleware

### 3. Post-Deploy Smoke Test

External HTTP check from GitHub Actions runner after deploy completes:
- Staging: hits `${{ secrets.STAGING_URL }}/health`
- Production: hits `${{ secrets.PRODUCTION_URL }}/health`
- Fails the job if HTTP status != 200

### 4. Automated Rollback (Production)

Production deploy workflow (`deploy-production.yml`) has a rollback step with `if: failure()` that:
- Reads `.previous_image_tag` from the VPS
- Pulls and deploys the previous image
- Verifies health after rollback

### 5. Git Release Tags

On successful staging deploy, the CI creates a git tag `release-{run_number}` pointing at the deployed commit SHA. This aligns with the Docker image tag for the same build.

### 6. CHANGELOG.md

Root-level changelog following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format. `[Unreleased]` section updated per feature branch; moved to dated release section when declaring a new version.

### 7. Versioning Policy

Semantic versioning (`vX.Y.Z`) for milestone releases, separate from deployment tags (`release-{N}`). Full policy documented in `specs/workflows/VERSIONING.md`.

### 8. Automated Release Workflow

**Workflow:** `.github/workflows/release.yml` (manual dispatch)
**Script:** `.github/scripts/prepare-release.sh`

Label-driven release automation:
1. Developer labels closed issues with `release: next`
2. Trigger workflow via GitHub Actions UI (with optional bump override)
3. Script collects labeled issues, detects version bump, generates CHANGELOG entries
4. Workflow commits CHANGELOG, creates git tag + GitHub Release, removes labels

**Version bump detection:**
- Any issue with `feature` or `enhancement` label → MINOR bump
- All other issues → PATCH bump
- Manual override available for MAJOR bumps

**CHANGELOG categorization:**

| Label | CHANGELOG Section |
|-------|------------------|
| `feature`, `enhancement` | Added |
| `bug` | Fixed |
| `refactor`, `devops`, `ui/ux` | Changed |
| Title/label contains "security" | Security |
| `documentation` only | Skipped |

**Does NOT trigger production deploy** — user runs `deploy-production.yml` separately after verifying the release.

## Required Secrets

- `STAGING_URL` — e.g. `https://staging.artverse.idata.ro`
- `PRODUCTION_URL` — e.g. `https://artverse.idata.ro`

## Files Changed

- `.github/workflows/ci.yml` — image tagging, smoke test, release tag, updated health check
- `.github/workflows/deploy-production.yml` — smoke test, rollback step, updated health check
- `.github/workflows/rollback-production.yml` — updated health check to `/health`
- `server/routes/health.ts` — new health endpoint
- `server/index.ts` — health router registration
- `Dockerfile` — `APP_VERSION` build arg
- `CHANGELOG.md` — new file
