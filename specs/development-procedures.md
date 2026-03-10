# ArtVerse — Development Procedures

## 1. Environments

| Environment | URL | Deploys | Database | Seed Data |
|-------------|-----|---------|----------|-----------|
| **Local** | `http://localhost:5000` | `npm run dev` | Local PostgreSQL (port 5433) | Optional (`SEED_DB=true`) |
| **Staging** | https://staging.artverse.idata.ro | Auto on push to `main` | Dedicated PostgreSQL on VPS | Yes |
| **Production** | https://artverse.idata.ro | Manual trigger via GitHub Actions | Dedicated PostgreSQL on VPS | No |

---

## 2. Day-to-Day Development Workflow

### Starting work on a feature or fix

```bash
git checkout main
git pull origin main
git checkout -b feature/my-feature-name    # or fix/bug-description
```

### Running locally

```bash
npm run dev          # Start dev server on port 5000
```

Or with Docker (matches production environment):

```bash
docker compose up    # PostgreSQL + app on ports 5433/5000
```

### Before committing — run the CI checks locally

```bash
npm run lint         # ESLint — must have 0 errors (warnings OK)
npm run check        # TypeScript type check (needs NODE_OPTIONS="--max-old-space-size=6144" if OOM)
npm test             # Vitest — all tests must pass
npm run build        # Production build — must succeed
```

### Committing

```bash
git add <specific files>
git commit -m "Short description of what and why"
```

### Pushing to GitHub

```bash
git push origin feature/my-feature-name
```

This triggers CI on the feature branch (lint, types, tests, build). No deploy happens — deploy only runs on `main`.

---

## 3. Getting Code to Staging

### Option A: Direct push to main (solo development)

```bash
git checkout main
git merge feature/my-feature-name
git push origin main
```

### Option B: Pull request (recommended for collaboration)

```bash
git push origin feature/my-feature-name
gh pr create --title "Add my feature" --body "Description of changes"
```

Wait for CI to pass on the PR, then merge via GitHub UI or:

```bash
gh pr merge --merge
```

### What happens automatically after push to main

```
Push to main
  → CI: Lint → Type Check → Tests → Build          (~3 min)
  → Docker: Build image → Push to GHCR              (~2 min)
  → Deploy: SSH to VPS → Pull image → Restart       (~15 sec)
  → Health check: GET /api/artists                   (up to 2 min)
```

Total time from push to staging live: **~5-6 minutes**.

### Monitoring the deploy

```bash
gh run list --limit 1                    # See latest run
gh run watch <run-id>                    # Watch it live
gh run view <run-id> --log-failed        # Debug failures
```

### Verifying staging

```bash
curl -sf https://staging.artverse.idata.ro/api/artists | head -c 200
curl -sf -o /dev/null -w "%{http_code}" https://staging.artverse.idata.ro/
```

---

## 4. Deploying to Production

Production deploys are **manual** — you choose when to promote a staging build.

### Step 1: Verify staging is working

Test the feature on https://staging.artverse.idata.ro. Make sure everything works as expected.

### Step 2: Find the image tag (commit SHA)

```bash
# The commit SHA of the current staging deploy:
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro "grep IMAGE_TAG ~/app/.env"
```

Or check the latest successful CI/CD run:

```bash
gh run list --workflow=ci.yml --status=success --limit 1
```

### Step 3: Trigger production deploy

**Via CLI:**

```bash
gh workflow run deploy-production.yml -f image_tag=<commit-sha>
```

**Via GitHub UI:**
1. Go to https://github.com/ilv78/Art-World-Hub/actions/workflows/deploy-production.yml
2. Click "Run workflow"
3. Enter the image tag (commit SHA)
4. Click "Run workflow"

### Step 4: Verify production

```bash
gh run list --workflow=deploy-production.yml --limit 1     # Check deploy status
curl -sf https://artverse.idata.ro/api/artists | head -c 200
```

---

## 5. Database Changes

### How schema changes work

The database schema is defined in `shared/schema.ts` using Drizzle ORM. The Docker entrypoint runs `drizzle-kit push --force` on every container start, which applies schema changes automatically.

### Procedure for schema changes

1. Edit `shared/schema.ts`
2. Run locally: `npm run db:push` to apply to your local DB
3. Test the changes locally
4. Push to `main` — staging will auto-apply the schema change on deploy
5. After verifying staging, deploy to production

### Caution

`drizzle-kit push` can drop columns/tables if you remove them from the schema. For production:
- **Adding** columns/tables is safe
- **Renaming** columns will drop the old and create the new (data loss)
- **Removing** columns will drop them (data loss)

For destructive changes, back up the production database first:

```bash
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro \
  "cd ~/app && docker compose exec -T db pg_dump -U artverse artverse_production" > backup.sql
```

---

## 6. Troubleshooting

### CI fails on lint

```bash
npm run lint                             # Run locally, fix errors
# Warnings (105 currently) don't fail CI — only errors do
```

### CI fails on type check

```bash
NODE_OPTIONS="--max-old-space-size=6144" npm run check
# tsc needs ~4-6GB heap for this project
```

### Staging deploy fails — health check timeout

```bash
# Check container logs on VPS
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose logs --tail=50 app"

# Check if containers are running
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose ps"
```

### Staging or production is down

```bash
# Restart containers
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose restart"

# Full recreate (if restart doesn't help)
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose down && docker compose up -d"
```

### Rollback production to previous version

```bash
# Find the previous image tag (from GitHub Actions run history)
gh run list --workflow=ci.yml --status=success --limit 5

# Deploy the older tag
gh workflow run deploy-production.yml -f image_tag=<previous-commit-sha>
```

### Check what's deployed

```bash
# Staging
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && grep IMAGE_TAG .env && docker compose ps"

# Production
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro \
  "cd ~/app && grep IMAGE_TAG .env && docker compose ps"
```

---

## 7. VPS Access

### SSH access

```bash
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro       # Staging user
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro    # Production user
ssh -i ~/.ssh/artverse-deploy root@artverse.idata.ro          # Root (for Nginx, SSL)
```

### Key paths on VPS

| Path | Purpose |
|------|---------|
| `/home/staging/app/` | Staging docker-compose + .env |
| `/home/production/app/` | Production docker-compose + .env |
| `/etc/nginx/sites-enabled/` | Nginx configs (staging + production) |
| `/etc/letsencrypt/` | SSL certificates (auto-renewed by certbot) |

### Docker project names

- `artverse-staging` — staging containers (`artverse-staging-app-1`, `artverse-staging-db-1`)
- `artverse-production` — production containers (`artverse-production-app-1`, `artverse-production-db-1`)

### Ports (all localhost-only)

| Port | Service |
|------|---------|
| 5003 | Staging app |
| 5435 | Staging PostgreSQL |
| 5002 | Production app |
| 5434 | Production PostgreSQL |

---

## 8. GitHub Secrets

| Secret | Value | Purpose |
|--------|-------|---------|
| `DEPLOY_HOST` | `artverse.idata.ro` | VPS hostname |
| `DEPLOY_SSH_KEY` | ed25519 private key | SSH access for both users |
| `GITHUB_TOKEN` | Auto-provided | GHCR authentication |

Database passwords and session secrets are stored in `.env` files on the VPS, not in GitHub Secrets.

---

## 9. Adding a New npm Package

```bash
npm install <package>                    # Runtime dependency
npm install --save-dev <package>         # Dev dependency (lint, test, build tools)
```

After installing, commit both `package.json` and `package-lock.json`. The CI and Docker build use `npm ci` which requires an up-to-date lockfile.

---

## 10. Useful Commands Reference

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Type check | `npm run check` |
| Run all tests | `npm test` |
| Run single test file | `npx vitest run server/__tests__/storage.test.ts` |
| Watch tests | `npm run test:watch` |
| Push DB schema | `npm run db:push` |
| Local Docker | `docker compose up` |
| Check CI status | `gh run list --limit 5` |
| Deploy to production | `gh workflow run deploy-production.yml -f image_tag=<sha>` |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-03-10 | Initial version — documents current CI/CD pipeline with staging and production environments |
