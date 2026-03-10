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

The database schema is defined in `shared/schema.ts` using Drizzle ORM. Two modes are used:

- **Staging:** Push mode (`drizzle-kit push --force`) — fast, auto-applies on container start. Staging data is disposable.
- **Production:** Migration mode (`drizzle-kit migrate`) — applies versioned SQL migration files. Safe, predictable, tracked.

The Docker entrypoint (`docker-entrypoint.sh`) checks the `DB_MIGRATION_MODE` env var:
- `DB_MIGRATION_MODE=migrate` → runs migration files from `migrations/`
- Unset or any other value → runs push mode

### Procedure for schema changes

1. Edit `shared/schema.ts`
2. Run locally: `npm run db:push` to apply to your local DB
3. Test the changes locally
4. Generate a migration file: `npx drizzle-kit generate`
5. Review the generated SQL in `migrations/`
6. Commit both the schema change and the migration file
7. Push to `main` — staging auto-applies via push mode, production will apply the migration file on next deploy

### Migration files

Migration files live in `migrations/` and are tracked in git. Drizzle uses `migrations/meta/_journal.json` to track which migrations have been applied. The `__drizzle_migrations` table in the database records applied migrations.

```bash
npx drizzle-kit generate     # Generate migration from schema diff
npm run db:migrate            # Apply migrations locally
npm run db:push               # Push schema directly (local dev only)
```

### Caution

For production (which uses migration mode), the generated SQL is what gets executed — always review it before committing. Watch out for:
- **Adding** columns/tables is safe
- **Renaming** columns generates DROP + CREATE (data loss) — write a custom migration instead
- **Removing** columns generates DROP (data loss) — back up first

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

**Option 1 — One-click rollback (recommended)**

```bash
# Rolls back to the version that was running before the current deploy
gh workflow run rollback-production.yml
```

**Option 2 — Rollback to a specific version**

```bash
# Find a known-good image tag
gh run list --workflow=ci.yml --status=success --limit 5

# Roll back to that specific tag
gh workflow run rollback-production.yml -f image_tag=<commit-sha>
```

**Option 3 — Emergency SSH rollback**

```bash
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro
cd ~/app
cat .previous_image_tag                     # See the previous tag
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<tag>/' .env
docker compose up -d --remove-orphans
```

**Note:** Rollback only affects the app image. If a database migration already ran, you may need to restore from a DB backup for destructive schema changes.

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
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Deploy notifications via Telegram |
| `TELEGRAM_CHAT_ID` | Numeric chat ID | Telegram chat for notifications |

Database passwords and session secrets are stored in `.env` files on the VPS, not in GitHub Secrets.

---

## 9. Notifications

Deploy notifications are sent to Telegram automatically. You'll receive a message for:

- **Staging deploys** — after every push to `main` (success or failure)
- **Production deploys** — after manual deploy (success or failure)
- **Production rollbacks** — after rollback (success or failure)

Each notification includes the status, image tag, who triggered it, and a link to the GitHub Actions run.

**Setup:** Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` GitHub secrets. If not set, notifications are silently skipped.

**Changing the bot:** If you need to regenerate the bot token (via @BotFather → `/revoke`), update the `TELEGRAM_BOT_TOKEN` GitHub secret with the new token.

---

## 10. Adding a New npm Package

```bash
npm install <package>                    # Runtime dependency
npm install --save-dev <package>         # Dev dependency (lint, test, build tools)
```

After installing, commit both `package.json` and `package-lock.json`. The CI and Docker build use `npm ci` which requires an up-to-date lockfile.

---

## 11. Useful Commands Reference

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
| Generate migration | `npx drizzle-kit generate` |
| Apply migrations | `npm run db:migrate` |
| Local Docker | `docker compose up` |
| Check CI status | `gh run list --limit 5` |
| Deploy to production | `gh workflow run deploy-production.yml -f image_tag=<sha>` |
| Rollback production | `gh workflow run rollback-production.yml` |
| Rollback to specific version | `gh workflow run rollback-production.yml -f image_tag=<sha>` |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-03-10 | Initial version — documents current CI/CD pipeline with staging and production environments |
| 2026-03-10 | Updated database section for dual-mode schema management (push for staging, migrate for production) |
| 2026-03-11 | Added rollback procedures (one-click, specific version, emergency SSH) and commands |
| 2026-03-11 | Added notifications section (Telegram) and updated GitHub secrets table |
