# ArtVerse — CI/CD Pipeline Specification

**Status:** Active
**Last Updated:** 2026-03-13

---

## 1. Current State

### What Exists Today

#### CI/CD Workflow (`.github/workflows/ci.yml`)

Single unified workflow with two jobs. Triggers on every push (all branches) and pull requests to `main`.

**Job 1: `ci`** — Lint, Type Check, Test & Build

| Step | What it does |
|------|-------------|
| Checkout | Clones the repo |
| Setup Node.js 20 | Installs Node with npm cache |
| Install dependencies | `npm ci` |
| Lint | `npm run lint` (ESLint 9 + TypeScript + React hooks) |
| Type check | `npm run check` (tsc with 6GB heap) |
| Run tests | `npm test` (Vitest, 32 tests) |
| Build | `npm run build` (Vite client + esbuild server) |

- Uses a PostgreSQL 16 Alpine service container (needed for the build to succeed)

**Job 2: `deploy`** — Build & Push Docker Image

| Step | What it does |
|------|-------------|
| Checkout | Clones the repo |
| Setup Docker Buildx | Enables advanced Docker builds |
| Login to GHCR | Authenticates to GitHub Container Registry |
| Build & push image | Multi-stage Docker build, pushes `latest` + `sha` tags |

- **Gated on CI** — `needs: ci`, only runs if all CI checks pass
- **Only on main push** — `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`
- Uses GHA layer caching for fast rebuilds
- **Does NOT deploy** — the image sits in GHCR, nothing pulls or runs it
- **No staging environment**
- **No production deployment**
- **No database migration step**
- **No health check after deploy**

#### Docker Setup

- **Dockerfile:** 3-stage build (deps → build → run), Node 20 slim, exposes port 5000
- **docker-compose.yml:** PostgreSQL 16 + app, health checks, persistent volume, localhost-only ports

#### What's Missing (Gap Summary)

| Gap | Impact |
|-----|--------|
| Tests not in CI | Broken logic can reach `main` |
| No linting in CI | Code style drift, potential bugs |
| Deploy doesn't gate on CI | Bad images can be pushed to GHCR |
| No actual deployment | GHCR image is never pulled to a server |
| No staging environment | Changes go untested in a real environment |
| No database migration step | Schema changes require manual intervention |
| No health checks post-deploy | No way to know if deploy succeeded |
| No rollback mechanism | If deploy breaks, recovery is manual |
| No secrets management strategy | Env vars set ad-hoc |
| No branch protection | Anyone can push directly to `main` |

---

## 2. Target Architecture

```
Feature Branch                   main
     │                            │
     │  push / PR                 │  merge
     ▼                            ▼
┌─────────────┐            ┌─────────────┐
│  CI Pipeline │            │  CI Pipeline │
│             │            │             │
│ ✓ Lint      │            │ ✓ Lint      │
│ ✓ Type check│            │ ✓ Type check│
│ ✓ Tests     │            │ ✓ Tests     │
│ ✓ Build     │            │ ✓ Build     │
└──────┬──────┘            └──────┬──────┘
       │                          │
       │ PR status gate           │ all green
       ▼                          ▼
  Must pass to merge      ┌──────────────┐
                          │ Build & Push  │
                          │ Docker Image  │
                          │ → GHCR       │
                          └──────┬───────┘
                                 │
                          ┌──────┴───────┐
                          ▼              ▼
                   ┌────────────┐ ┌────────────┐
                   │  STAGING   │ │ PRODUCTION │
                   │            │ │            │
                   │ Auto-deploy│ │ Manual     │
                   │ on merge   │ │ approval   │
                   │            │ │ or tag     │
                   │ Seed data  │ │            │
                   │ Health chk │ │ Health chk │
                   └────────────┘ └────────────┘
                        │
                        ▼
                  Smoke tests
                  against staging
```

### Environments

| Environment | Purpose | Trigger | Database | URL Pattern |
|-------------|---------|---------|----------|-------------|
| **Local** | Development | `npm run dev` / `docker compose up` | Local PostgreSQL (port 5433) | `localhost:5000` |
| **CI** | Validation | Push / PR | Ephemeral service container | N/A |
| **Staging** | Pre-production testing | Auto on merge to `main` | Dedicated staging DB | `staging.artverse.<domain>` |
| **Production** | Live site | Manual approval / git tag | Dedicated production DB | `artverse.<domain>` |

---

## 3. Implementation Plan (Step by Step)

### Step 1: Add Tests to CI

**Status: DONE**

Add `npm test` to the CI workflow after the build step.

**File:** `.github/workflows/ci.yml`

**Change:** Add one step:
```yaml
      - name: Run tests
        run: npm test
```

**Why first:** Tests are the most fundamental CI gate. Without them, all other pipeline improvements are built on an unreliable foundation.

---

### Step 2: Add Linting to CI

**Status: DONE**

Set up ESLint with TypeScript support and add it as a CI step.

**Tasks:**
1. Install ESLint + TypeScript parser + relevant plugins
2. Create `.eslintrc.cjs` or `eslint.config.mjs` (flat config)
3. Add `npm run lint` script to `package.json`
4. Add lint step to CI workflow (before type check — it's fastest)

**Suggested ESLint config scope:**
- `@typescript-eslint/recommended` rules
- React hooks rules (`eslint-plugin-react-hooks`)
- Import order rules (optional)
- No Prettier for now (can add later if desired)

---

### Step 3: Gate Deploy on CI

**Status: DONE**

Make `deploy.yml` depend on the CI workflow passing. Currently the deploy workflow runs independently — a broken build can push a bad Docker image.

**Options:**
- **Option A:** Merge CI and deploy into one workflow with two jobs where `deploy` has `needs: [ci]`
- **Option B:** Keep separate workflows, use `workflow_run` trigger so deploy only runs after CI succeeds

**Recommended: Option A** — simpler, easier to reason about.

**New workflow structure:**
```yaml
jobs:
  ci:
    # lint, type check, test, build
  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main'
    # build Docker image, push to GHCR
```

---

### Step 4: Set Up Branch Protection Rules

**Status: SKIPPED — requires GitHub Pro or public repo (currently private free plan)**

Configure GitHub branch protection on `main` to enforce quality gates.

**Rules to enable:**
- Require pull request before merging (no direct push to `main`)
- Require CI status checks to pass before merging
- Require at least 1 review (optional for solo dev, recommended for team)
- Require branch to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

**How:** GitHub repo → Settings → Branches → Add rule for `main`

---

### Step 5: Choose and Set Up Hosting Infrastructure

**Status: DONE — VPS at Webdock chosen (artverse.idata.ro)**

**Decision:** Single VPS (Webdock) running both staging and production as separate Linux users.

| | Staging | Production |
|---|---|---|
| **User** | `staging` | `production` |
| **Subdomain** | `staging.artverse.idata.ro` | `artverse.idata.ro` |
| **App port** | 5003 (localhost only) | 5002 (localhost only) |
| **DB port** | 5435 (localhost only) | 5434 (localhost only) |
| **App directory** | `/home/staging/app/` | `/home/production/app/` |

**Files created:**
- `deploy/server-setup.sh` — creates users, SSH keys, Docker group, app directories
- `deploy/staging/docker-compose.yml` — staging containers (app + PostgreSQL)
- `deploy/production/docker-compose.yml` — production containers (app + PostgreSQL + OIDC)
- `deploy/staging/.env.example` / `deploy/production/.env.example` — environment templates
- `deploy/nginx/staging.artverse.idata.ro.conf` — Nginx reverse proxy for staging
- `deploy/nginx/artverse.idata.ro.conf` — Nginx reverse proxy for production
- `deploy/deploy.sh` — reusable deploy script (pull image, update, health check)

**GitHub Secrets (set):**
- `DEPLOY_HOST` = `artverse.idata.ro`
- `DEPLOY_SSH_KEY` = shared ed25519 key for both users

---

### Step 6: Deploy to Staging (Auto on Merge)

**Status: DONE — fully operational at https://staging.artverse.idata.ro**

Staging auto-deploys on every push to `main`. Pipeline: CI passes → Docker image pushed to GHCR → SSH to VPS as `staging` user → pull image → `docker compose up -d` → health check.

First successful deploy: run 22927189022 (CI 3m20s + Docker 1m53s + Deploy 12s = ~5.5min total).

**Issues fixed during implementation:**
- `NODE_ENV=production` in CI caused `npm ci` to skip devDependencies (ESLint not found) → moved to build step only
- `@ts-expect-error` unused in replitAuth.ts → removed
- MCP SDK deep type instantiation errors in CI → suppressed with `@ts-expect-error`
- Docker image tag uppercase (`Art-World-Hub`) → added lowercase step
- `wget` not in Node slim image → replaced health check with `node -e fetch()`
- Fresh DB had no tables → added `docker-entrypoint.sh` that runs `drizzle-kit push` on startup

---

### Step 7: Post-Deploy Health Checks & Smoke Tests

**Status: DONE (built into deploy steps)**

Health checks are embedded in the deploy SSH scripts (both staging and production). After `docker compose up -d`, the script polls `GET /api/artists` on `localhost:5000` inside the container for up to 30 seconds. If it fails, it dumps the last 50 lines of app logs and exits with error code.

---

### Step 8: Deploy to Production (Manual Approval)

**Status: DONE (workflow ready, Nginx swap pending)**

Created `.github/workflows/deploy-production.yml` with `workflow_dispatch` trigger (Option C). Docker-compose and .env already deployed to `/home/production/app/`. GHCR login done.

**How to deploy to production:**
1. Go to GitHub → Actions → "Deploy to Production"
2. Click "Run workflow"
3. Enter the image tag (commit SHA from a successful staging deploy, or `latest`)
4. The workflow SSHes as `production` user, pulls the image, restarts, and health checks

**Status: DONE — fully operational at https://artverse.idata.ro**

First production deploy completed. Nginx swapped from port 5000 (old deployment) to port 5002.

**Issues fixed during implementation:**
- Docker compose project name collision — both envs used `app` project name, causing shared containers. Fixed with `name: artverse-staging` / `name: artverse-production`.
- DB password contained `/` and `+` which broke URL parsing in `DATABASE_URL`. Regenerated with hex-only passwords.

---

### Step 9: Database Migration Strategy

**Status: DONE**

Dual-mode database schema management: staging uses push mode (fast, disposable data), production uses migration files (safe, versioned).

**What was implemented:**

1. Generated initial baseline migration from current schema: `migrations/0000_sturdy_frightful_four.sql` (10 tables, all foreign keys and indexes)
2. Added `npm run db:migrate` script to `package.json`
3. Updated `docker-entrypoint.sh` to check `DB_MIGRATION_MODE` env var:
   - `DB_MIGRATION_MODE=migrate` → runs `npx drizzle-kit migrate` (applies versioned SQL files)
   - Default (unset or any other value) → runs `npx drizzle-kit push --force` (push mode)
4. Updated `deploy/production/docker-compose.yml` to set `DB_MIGRATION_MODE=migrate`
5. Updated `Dockerfile` to copy `migrations/` directory into the production image
6. Staging docker-compose left unchanged — defaults to push mode (no `DB_MIGRATION_MODE` set)

**Schema change workflow going forward:**
- Edit `shared/schema.ts`
- Run `npx drizzle-kit generate` to create a new migration file
- Commit the migration file alongside the schema change
- Staging: auto-applies via push mode on deploy
- Production: applies the versioned migration file on deploy

---

### Step 10: Rollback Mechanism

**Status: DONE**

Fast recovery path when a production deploy breaks.

**What was implemented:**

1. **Rollback state tracking:** `deploy-production.yml` now saves the current `IMAGE_TAG` to `.previous_image_tag` before deploying a new version. This gives a one-click undo.
2. **Rollback workflow:** Created `.github/workflows/rollback-production.yml` with `workflow_dispatch` trigger:
   - Leave `image_tag` input empty → automatically rolls back to the previous deploy (reads `.previous_image_tag`)
   - Specify an `image_tag` → rolls back to that specific version
   - Saves the current tag before rolling back (so you can undo the rollback too)
   - Includes full health check after rollback
3. **Three rollback options:**
   - **One-click:** GitHub Actions → "Rollback Production" → Run workflow (empty input)
   - **Specific version:** GitHub Actions → "Rollback Production" → enter a known-good SHA
   - **Emergency SSH:** `ssh production@artverse.idata.ro`, edit `IMAGE_TAG` in `.env`, `docker compose up -d`

**Limitation:** This rolls back the app image only. Database migrations are not reversed — for destructive schema changes, restore from a DB backup.

---

### Step 11: Monitoring & Notifications

**Status: DONE**

Telegram notifications on every deploy, rollback, and failure.

**What was implemented:**

1. **Telegram bot notifications** added to all three deploy workflows:
   - `ci.yml` → `deploy-staging` job: notifies on staging deploy success/failure
   - `deploy-production.yml`: notifies on production deploy success/failure
   - `rollback-production.yml`: notifies on rollback success/failure
2. Each notification includes: `@racu8_bot` header, status emoji, environment name with repo name, environment URL, image tag, and actor
3. Notifications use `if: always()` so they fire even on failure
4. Gracefully skip if `TELEGRAM_BOT_TOKEN` secret is not set

**Notification format:**
```
@racu8_bot
✅ Staging deployment: success [Art-World-Hub]
Staging address: https://staging.artverse.idata.ro
Tag: <commit-sha>
By: username
```

**GitHub Secrets required:**
- `TELEGRAM_BOT_TOKEN` — Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` — personal or group chat ID for notifications

**Optional future additions:**
- UptimeRobot for external uptime monitoring (no code changes needed)
- Sentry for error tracking
- CI failure notifications (currently only deploy jobs notify)

---

## 4. GitHub Secrets Inventory

| Secret | Status | Used In | Purpose |
|--------|--------|---------|---------|
| `GITHUB_TOKEN` | Auto-provided | Build image | GHCR authentication |
| `DEPLOY_HOST` | Set | Staging + Production deploy | VPS hostname (`artverse.idata.ro`) |
| `DEPLOY_SSH_KEY` | Set | Staging + Production deploy | Shared ed25519 SSH key |
| `TELEGRAM_BOT_TOKEN` | Set | Deploy notifications | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Set | Deploy notifications | Telegram chat ID for notifications |

DB passwords and session secrets are stored in `.env` files on the VPS (not in GitHub Secrets), since the docker-compose files read them locally.

---

## 5. Pipeline Diagrams

### 5.1 Development Workflow (end-to-end)

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                      DEVELOPER WORKSTATION                      │
 │                                                                 │
 │   1. Create branch ─── git checkout -b feature/issue-N-name    │
 │   2. Write code                                                 │
 │   3. Run checks ────── npm run lint / check / test / build     │
 │   4. Generate migration (if schema changed)                     │
 │   5. Commit ────────── git commit (closes #N)                  │
 │   6. Push ──────────── git push origin feature/...             │
 └─────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                     GITHUB (Pull Request)                       │
 │                                                                 │
 │   CI runs on PR branch (lint → types → tests → build)          │
 │   ✓ Pass → PR is mergeable                                     │
 │   ✗ Fail → fix and push again                                  │
 │                                                                 │
 │   Review → Merge to main                                        │
 └─────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                   AUTOMATIC PIPELINE (on main)                  │
 │                                                                 │
 │   CI ──► Docker Build ──► Push to GHCR ──► Deploy to Staging   │
 │                                              │                  │
 │                                              ▼                  │
 │                                      📱 Telegram notification   │
 └─────────────────────────────────────────────────────────────────┘
                           │
                      Developer verifies
                      staging manually
                           │
                           ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                  MANUAL PRODUCTION DEPLOY                       │
 │                                                                 │
 │   gh workflow run deploy-production.yml -f image_tag=<sha>      │
 │                                                                 │
 │   Save rollback state ──► Pull image ──► Deploy ──► Health chk │
 │                                                       │        │
 │                                                       ▼        │
 │                                               📱 Telegram      │
 └─────────────────────────────────────────────────────────────────┘
```

### 5.2 CI/CD Pipeline (ci.yml — triggers on every push)

```
                        Push to any branch
                              │
                              ▼
               ┌──────────────────────────┐
               │     CI Job (~3 min)      │
               │                          │
               │  ┌────────────────────┐  │
               │  │  npm run lint      │  │  ← ESLint (0 errors required)
               │  └────────┬───────────┘  │
               │           ▼              │
               │  ┌────────────────────┐  │
               │  │  npm run check     │  │  ← TypeScript (6GB heap)
               │  └────────┬───────────┘  │
               │           ▼              │
               │  ┌────────────────────┐  │
               │  │  npm test          │  │  ← Vitest (32 tests)
               │  └────────┬───────────┘  │
               │           ▼              │
               │  ┌────────────────────┐  │
               │  │  npm run build     │  │  ← Vite + esbuild
               │  └────────────────────┘  │
               └──────────┬───────────────┘
                          │
                          │ only on main push
                          ▼
               ┌──────────────────────────┐
               │  Docker Job (~2 min)     │
               │                          │
               │  Build multi-stage image │
               │  Push to GHCR:           │
               │    :latest               │
               │    :<commit-sha>         │
               └──────────┬───────────────┘
                          │
                          │ needs: docker job
                          ▼
               ┌──────────────────────────┐
               │  Staging Deploy (~30s)   │
               │                          │
               │  SSH → staging user      │
               │  docker pull <sha>       │
               │  docker compose up -d    │
               │  Health check (2 min)    │
               │  📱 Telegram notify      │
               └──────────────────────────┘
```

### 5.3 Production Deploy (deploy-production.yml — manual trigger)

```
  gh workflow run deploy-production.yml -f image_tag=<sha>
                          │
                          ▼
               ┌──────────────────────────┐
               │  Production Deploy       │
               │                          │
               │  SSH → production user   │
               │  Save current tag ────┐  │
               │    → .previous_image_tag │
               │  docker pull <sha>       │
               │  docker compose up -d    │
               │  DB migrate (not push)   │
               │  Health check (2 min)    │
               │  📱 Telegram notify      │
               └──────────────────────────┘
```

### 5.4 Rollback (rollback-production.yml — manual trigger)

```
  gh workflow run rollback-production.yml [-f image_tag=<sha>]
                          │
                   ┌──────┴──────┐
                   │             │
              tag empty     tag provided
                   │             │
                   ▼             │
          Read .previous_       │
          image_tag              │
                   │             │
                   └──────┬──────┘
                          ▼
               ┌──────────────────────────┐
               │  Rollback Deploy         │
               │                          │
               │  Save current → previous │
               │  docker pull <old-sha>   │
               │  docker compose up -d    │
               │  Health check (2 min)    │
               │  📱 Telegram notify      │
               └──────────────────────────┘
```

### 5.5 Infrastructure Overview

```
                    ┌─────────────────────┐
                    │    GitHub (GHCR)     │
                    │                     │
                    │  Docker images:     │
                    │  ghcr.io/ilv78/     │
                    │  art-world-hub      │
                    │    :latest          │
                    │    :<sha>           │
                    └────────┬────────────┘
                             │ docker pull
                    ┌────────┴────────────┐
                    │                     │
                    ▼                     ▼
     ┌──────────────────────┐  ┌──────────────────────┐
     │  STAGING             │  │  PRODUCTION           │
     │  staging user        │  │  production user      │
     │                      │  │                       │
     │  App    → :5003      │  │  App    → :5002       │
     │  DB     → :5435      │  │  DB     → :5434       │
     │                      │  │                       │
     │  DB mode: push       │  │  DB mode: migrate     │
     │  Auto-deploy on main │  │  Manual deploy        │
     └──────────┬───────────┘  └──────────┬────────────┘
                │                         │
                └────────┬────────────────┘
                         │ localhost only
                         ▼
              ┌──────────────────────┐
              │      Nginx           │
              │                      │
              │  staging.artverse.   │
              │  idata.ro → :5003   │
              │                      │
              │  artverse.           │
              │  idata.ro → :5002   │
              │                      │
              │  SSL via certbot     │
              └──────────────────────┘
```

---

## 6. Security Hardening (2026-03-13)

### 6.1 GitHub Actions Hardening

All third-party actions across all workflow files are **pinned to commit SHAs** (not mutable version tags like `@v3` or `@v6`). This prevents supply chain attacks where a compromised action tag is silently redirected to malicious code.

| Action | Pinned SHA |
|--------|-----------|
| `actions/checkout` | `de0fac2e4500dabe0009e67214ff5f5447ce83dd` |
| `actions/setup-node` | `53b83947a5a98c8d113130e565377fae1a50d02f` |
| `docker/setup-buildx-action` | `4d04d5d9486b7bd6fa91e7baf45bbb4f8b9deedd` |
| `docker/login-action` | `c94ce9fb468520275223c153574b00df6fe4bcc9` |
| `docker/build-push-action` | `d08e5c354a6adb9ed34480a06d141179aa583294` |
| `appleboy/scp-action` | `ff85246acaad7bdce478db94a363cd2bf7c90345` |
| `appleboy/ssh-action` | `0ff4204d59e8e51228ff73bce53f80d53301dee2` |
| `anthropics/claude-code-action` | `5d0cc745cd0cce4c0e9e0b3511de26c3bc285eb5` |

**Applies to:** `ci.yml`, `deploy-production.yml`, `rollback-production.yml`, `doc-agent.yml`, `issue-tracker.yml`

### 6.2 Shell Injection Prevention

All GitHub context variables (`${{ github.sha }}`, `${{ github.actor }}`, `${{ github.event.inputs.* }}`, `${{ steps.*.outputs.* }}`) are moved from inline `${{ }}` interpolation in `run:` blocks to `env:` blocks. Shell scripts reference them as `$ENV_VAR` instead. This prevents shell injection if an attacker can control the input value (e.g., PR title, workflow dispatch input).

For SSH deploy steps, variables are passed via `appleboy/ssh-action`'s `envs:` parameter rather than embedded in the script string.

### 6.3 Explicit Permissions Blocks

All workflow files now declare explicit `permissions:` blocks at the top level and/or job level, following the principle of least privilege:

| Workflow | Permissions |
|----------|------------|
| `ci.yml` | `contents: read`, `packages: write` (Docker job only) |
| `deploy-production.yml` | `contents: read` |
| `rollback-production.yml` | `contents: read` |
| `doc-agent.yml` | `contents: read`, `pull-requests: write` (enforce), `issues: write` (audit) |
| `issue-tracker.yml` | `contents: write`, `pull-requests: read` |

### 6.4 Security Scanning Pipeline

`.github/workflows/security.yml` runs 7 security scanning jobs on every push and PR:

| Job | Tool | Purpose |
|-----|------|---------|
| `gitleaks` | Gitleaks | Scan git history for committed secrets |
| `npm-audit` | npm audit | Check for known vulnerabilities in dependencies |
| `semgrep` | Semgrep | Static analysis for security anti-patterns |
| `hadolint` | Hadolint | Dockerfile best practice linting |
| `trivy` | Trivy | Container image vulnerability scanning |
| `custom-checks` | `.github/scripts/security-checks.sh` | ArtVerse-specific security checks |
| `gate` | — | Aggregation gate — fails if any upstream job fails |

All actions in `security.yml` are pinned to commit SHAs. The pipeline has explicit `permissions: contents: read` and runs on `push` and `pull_request` triggers.

**Spec:** `specs/SECURITY_AGENT.md` defines the audit scope and methodology.

### 6.5 Issue Tracker Auto-Update

`.github/workflows/issue-tracker.yml` triggers on `issues: closed` events and automatically updates `specs/issue-tracker.md`:

1. **Parses labels** — extracts priority (`priority: *`) and category (`bug`, `feature`, etc.) from issue labels
2. **Finds linked PR** — searches merged PRs that reference the closed issue to get PR number and branch name
3. **Updates tracker** — if the issue is in the Active table, moves it to Completed; otherwise appends to Completed with date, branch, and PR link
4. **Revision log** — appends an auto-generated entry to the revision log
5. **Bug doc** — if the issue is labeled `bug`, creates `specs/bugs/BUG-XXXX-title.md` (or updates an existing one to "Resolved")

Commits and pushes directly to `main`. Skips issues labeled `docs-audit` (automated audit issues).

**Script:** `.github/scripts/update-issue-tracker.sh`

---

## 7. Revision Log

| Date | Change |
|------|--------|
| 2026-03-10 | Initial spec created — documented current state and 11-step implementation plan |
| 2026-03-10 | Step 1 done — added `npm test` step to `ci.yml`, renamed job to "Type Check, Test & Build" |
| 2026-03-10 | Step 2 done — installed ESLint 9 + typescript-eslint + react-hooks plugin, created `eslint.config.mjs`, added `npm run lint` script, added lint step to CI. Fixed 2 errors (empty block in hallway-gallery-3d.tsx, @ts-ignore→@ts-expect-error in replitAuth.ts). 105 warnings remain (non-blocking). |
| 2026-03-10 | Step 3 done — merged `ci.yml` and `deploy.yml` into single workflow (Option A). Deploy job has `needs: ci` gate + `if` condition for main branch push only. Deleted `deploy.yml`. Updated current state section to reflect new structure. |
| 2026-03-10 | Step 4 skipped — branch protection and rulesets both require GitHub Pro or public repo. Revisit when repo goes public or plan is upgraded. |
| 2026-03-10 | Steps 5-8 done (config/workflow side) — chose VPS at Webdock (artverse.idata.ro), created deploy directory with docker-compose files for staging/production, Nginx configs, server setup script, deploy script. Added `deploy-staging` job to ci.yml, created `deploy-production.yml` (manual dispatch). Set `DEPLOY_HOST` and `DEPLOY_SSH_KEY` secrets. Health checks built into deploy scripts. |
| 2026-03-10 | VPS setup completed — created staging/production users, SSH keys, Docker group. Ports adjusted to avoid conflicts with existing services (staging: 5003/5435, production: 5002/5434). Copied docker-compose and .env files to both users. Installed Nginx configs, SSL via certbot for staging.artverse.idata.ro. Production Nginx swap pending (existing config on port 5000 kept until new deployment is ready). |
| 2026-03-10 | First successful end-to-end deploy to staging. Fixed: NODE_ENV in CI, unused @ts-expect-error, MCP SDK type errors, Docker tag casing, wget→node health check, added docker-entrypoint.sh for DB schema push. Staging live at https://staging.artverse.idata.ro |
| 2026-03-10 | Production deployed. Swapped Nginx from port 5000→5002, added docker-compose project names (`artverse-staging`/`artverse-production`) to avoid container collisions, regenerated DB password (URL-safe hex). Both environments live: staging at https://staging.artverse.idata.ro, production at https://artverse.idata.ro |
| 2026-03-10 | Step 9 done — dual-mode DB schema management. Generated baseline migration (`migrations/0000_sturdy_frightful_four.sql`). Updated `docker-entrypoint.sh` to check `DB_MIGRATION_MODE` env var (push vs migrate). Production docker-compose sets `DB_MIGRATION_MODE=migrate`. Dockerfile copies `migrations/` directory. Added `npm run db:migrate` script. |
| 2026-03-11 | Step 10 done — rollback mechanism. `deploy-production.yml` saves current tag to `.previous_image_tag` before deploying. Created `rollback-production.yml` workflow (auto-rollback to previous or specified tag). |
| 2026-03-11 | Step 11 done — Telegram notifications on all deploy/rollback workflows. Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets. |
| 2026-03-11 | Replaced old pipeline diagram with 5 comprehensive diagrams: development workflow, CI/CD pipeline, production deploy, rollback, and infrastructure overview. Updated Telegram secrets status to Set. |
| 2026-03-11 | Updated Telegram notification format: added @racu8_bot header, repo name, environment URLs. Removed "View run" link. (Issue #26, PR #27) |
| 2026-03-13 | Added Section 6: Security hardening — SHA-pinned actions, shell injection prevention, explicit permissions blocks, security scanning pipeline documentation. (Issue #77, PR #85) |
| 2026-03-13 | Added Section 6.5: Issue Tracker Auto-Update workflow — auto-updates issue-tracker.md and creates bug docs on issue close. (Issue #89) |
