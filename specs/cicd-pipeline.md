# ArtVerse — CI/CD Pipeline Specification

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

**Status: NOT STARTED**

Currently using Drizzle push mode (`npm run db:push`), which is fine for development but risky for production (it can drop columns/tables).

**Options:**
- **Keep push mode** for staging (acceptable — staging data is disposable)
- **Switch to Drizzle migrations** for production (`drizzle-kit generate` → `drizzle-kit migrate`)
- Add migration step to deploy workflow, run before app starts

**Tasks:**
1. Generate initial migration from current schema: `npx drizzle-kit generate`
2. Add `npm run db:migrate` script
3. Add migration step in deploy workflow (runs before container restart)
4. Test migration path: staging first, then production

---

### Step 10: Rollback Mechanism

**Status: NOT STARTED**

If a deploy breaks production, you need a fast recovery path.

**Approach:**
- Every Docker image is tagged with its commit SHA (`ghcr.io/repo:abc123`)
- Rollback = deploy the previous SHA tag
- Add a manual `workflow_dispatch` workflow that accepts an image tag and deploys it
- Keep last 5 images in GHCR (prune older ones)

---

### Step 11: Monitoring & Notifications

**Status: NOT STARTED**

Know when things break before users tell you.

**Options:**
- **Uptime monitoring:** UptimeRobot (free), Checkly, or simple cron curl
- **Error tracking:** Sentry (free tier)
- **Deploy notifications:** GitHub Actions → Slack/Discord webhook
- **Log aggregation:** Docker logs → Loki/Grafana or simple `docker logs` on VPS

---

## 4. GitHub Secrets Inventory

| Secret | Status | Used In | Purpose |
|--------|--------|---------|---------|
| `GITHUB_TOKEN` | Auto-provided | Build image | GHCR authentication |
| `DEPLOY_HOST` | Set | Staging + Production deploy | VPS hostname (`artverse.idata.ro`) |
| `DEPLOY_SSH_KEY` | Set | Staging + Production deploy | Shared ed25519 SSH key |

DB passwords and session secrets are stored in `.env` files on the VPS (not in GitHub Secrets), since the docker-compose files read them locally.

---

## 5. Final Pipeline Overview

When fully implemented, the pipeline will look like:

```
Developer pushes code
         │
         ▼
    ┌─────────┐
    │  LINT    │ ── fail → block merge
    ├─────────┤
    │  TYPES  │ ── fail → block merge
    ├─────────┤
    │  TESTS  │ ── fail → block merge
    ├─────────┤
    │  BUILD  │ ── fail → block merge
    └────┬────┘
         │ all pass
         ▼
    PR mergeable ✓
         │
         │ merged to main
         ▼
    ┌──────────────┐
    │ Build Docker  │
    │ Push to GHCR  │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │   STAGING    │
    │ Auto-deploy  │
    │ DB push      │
    │ Health check │
    │ Smoke tests  │
    └──────┬───────┘
           │ staging verified
           │
           │ git tag v1.x.x
           ▼
    ┌──────────────┐
    │  PRODUCTION  │
    │ Approval gate│
    │ DB migrate   │
    │ Deploy       │
    │ Health check │
    │ Notify       │
    └──────────────┘
```

---

## 6. Revision Log

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
