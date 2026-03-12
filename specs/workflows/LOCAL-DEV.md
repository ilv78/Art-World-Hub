# ArtVerse — Local Development

**Status:** Active
**Last Updated:** 2026-03-12

---

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
npm run dev          # Start dev server on port 5000 (loads .env via dotenv)
```

The server uses `dotenv` to load `.env` automatically. For local development outside Docker, ensure your `.env` has the correct `DATABASE_URL` pointing to `localhost:5433` (not the Docker-internal `db` hostname).

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

## 4. Database Changes

### How schema changes work

The database schema is defined in `shared/schema.ts` using Drizzle ORM. Two modes are used:

- **Staging:** Push mode (`drizzle-kit push --force`) — fast, auto-applies on container start. Staging data is disposable.
- **Production:** Migration mode (`drizzle-kit migrate`) — applies versioned SQL migration files. Safe, predictable, tracked.

See `specs/architecture/DATA-MODEL.md` for full schema documentation and migration procedures.

---

## 5. Adding a New npm Package

```bash
npm install <package>                    # Runtime dependency
npm install --save-dev <package>         # Dev dependency (lint, test, build tools)
```

After installing, commit both `package.json` and `package-lock.json`. The CI and Docker build use `npm ci` which requires an up-to-date lockfile.

---

## 6. Troubleshooting

### CI fails on lint

```bash
npm run lint                             # Run locally, fix errors
# Warnings don't fail CI — only errors do
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

## 7. Useful Commands Reference

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
