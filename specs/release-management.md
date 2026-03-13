# Release Management Spec — ArtVerse

## Overview

This spec defines the release management system for ArtVerse. Claude Code must implement all changes described here in the order specified. Do not skip steps or reorder them — sequencing is intentional.

**Stack context:** TypeScript monolith, React + Express + PostgreSQL, Docker, GitHub Actions CI/CD, GHCR for image registry, single VPS for production.

---

## 1. Docker Image Tagging — GHCR

**File to modify:** `.github/workflows/cd.yml` (or equivalent CD workflow file)

**Problem being solved:** Images currently push only a `latest` tag. Rollbacks have no stable target.

**Required change:** Every production image push must be tagged with three identifiers:

```yaml
tags: |
  ghcr.io/${{ github.repository_owner }}/artverse:latest
  ghcr.io/${{ github.repository_owner }}/artverse:${{ github.sha }}
  ghcr.io/${{ github.repository_owner }}/artverse:${{ github.run_number }}
```

**Rules:**
- `latest` — always points to most recent deploy (existing behaviour, keep it)
- `github.sha` — exact commit hash, provides full git traceability
- `github.run_number` — human-readable monotonic integer, use this in rollback commands

**Rollback step update:** The existing rollback step must reference `github.run_number`, not `latest`. Update it to accept a `run_number` input parameter so rollbacks can target any previous build.

---

## 2. Health Check Endpoint — Express

**File to create:** `server/routes/health.ts`

**Problem being solved:** CD pipeline reports success when the container starts, not when the application is actually healthy. A failed DB connection or missing env var is invisible to the pipeline.

**Required implementation:**

```typescript
import { Router } from 'express';
import { db } from '../db'; // adjust import path to match project db singleton

const router = Router();

router.get('/health', async (req, res) => {
  try {
    // lightweight DB connectivity check
    await db.execute('SELECT 1');
    res.status(200).json({
      status: 'ok',
      version: process.env.APP_VERSION ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database unreachable',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
```

**Wire it up:** Register this router in the main Express app file (`server/index.ts` or equivalent):

```typescript
import healthRouter from './routes/health';
app.use('/', healthRouter);
```

**Environment variable:** Add `APP_VERSION` to the Docker build args and pass it through to the container. Set it equal to `github.run_number` at build time:

```yaml
# In CD workflow build step
build-args: |
  APP_VERSION=${{ github.run_number }}
```

And in the Dockerfile:

```dockerfile
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
```

---

## 3. Post-Deploy Smoke Test — GitHub Actions

**File to modify:** `.github/workflows/cd.yml`

**Problem being solved:** No automated verification that the deployed container is healthy after deploy completes.

**Add this step after the deploy step:**

```yaml
- name: Smoke test — health check
  run: |
    echo "Waiting for container to boot..."
    sleep 15
    HEALTH_URL="${{ secrets.PRODUCTION_URL }}/health"
    HTTP_STATUS=$(curl --silent --output /dev/null --write-out "%{http_code}" "$HEALTH_URL")
    if [ "$HTTP_STATUS" != "200" ]; then
      echo "Health check failed — HTTP $HTTP_STATUS"
      echo "Triggering rollback..."
      exit 1
    fi
    echo "Health check passed — deployment verified"
```

**Required secret:** Add `PRODUCTION_URL` to GitHub repository secrets (e.g. `https://artverse.yourdomain.com`). Do not hardcode the URL.

**Failure behaviour:** If this step exits with code 1, the existing rollback step must fire. Verify the workflow `if` condition on the rollback step covers this case:

```yaml
- name: Rollback on failure
  if: failure()
  run: # existing rollback logic here
```

---

## 4. Automated Git Release Tags — GitHub Actions

**File to modify:** `.github/workflows/cd.yml`

**Problem being solved:** Git history is operational (every commit) but has no release identity. There is no way to see in git which commits constitute a production release.

**Add this step after the smoke test passes:**

```yaml
- name: Tag release in git
  if: success()
  run: |
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git tag "release-${{ github.run_number }}" "${{ github.sha }}"
    git push origin "release-${{ github.run_number }}"
```

**Tag naming convention:** `release-{run_number}` (e.g. `release-42`). This aligns with the Docker image tag for the same build — one number identifies both the image and the git state.

---

## 5. Branch Protection — GitHub Repository Settings

**This is a GitHub settings change, not a code change. Document it here for the issue record.**

Apply the following protection rules to the `main` branch:

- Require status checks to pass before merging
  - Required check: CI workflow (lint + tests)
- Require branches to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

**Effect:** It becomes structurally impossible to merge broken code to `main`. CI is no longer advisory — it is a hard gate.

---

## 6. CHANGELOG.md — Initial File

**File to create:** `CHANGELOG.md` at repository root

**Format:** Keep a Changelog (https://keepachangelog.com/en/1.0.0/)

**Initial content:**

```markdown
# Changelog

All notable changes to ArtVerse will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Releases are tagged as `release-{run_number}` in git and correspond to Docker image tags of the same number.

## [Unreleased]

### Added
- Release management system: image tagging, health checks, smoke tests, git release tags

```

**Process going forward (for human, not Claude Code):** Before merging a feature branch to `main`, move items from `[Unreleased]` to a dated release section.

---

## Acceptance Criteria

Claude Code must verify all of the following before considering this issue resolved:

- [ ] CD workflow builds and pushes Docker images with all three tags (`latest`, `sha`, `run_number`)
- [ ] `GET /health` returns `200 { status: 'ok' }` when DB is reachable
- [ ] `GET /health` returns `503 { status: 'error' }` when DB is not reachable
- [ ] CD workflow smoke test step exists and runs after deploy
- [ ] CD workflow rollback step fires when smoke test fails (`if: failure()`)
- [ ] CD workflow tags git with `release-{run_number}` on successful deploy
- [ ] `APP_VERSION` env var is passed from build args through to running container
- [ ] `CHANGELOG.md` exists at repository root with correct initial content
- [ ] No hardcoded URLs, secrets, or credentials anywhere in workflow files
- [ ] All TypeScript in `health.ts` passes existing lint and type-check rules
