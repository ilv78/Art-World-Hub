# Vernis9 — Deployment Procedures

**Status:** Active
**Last Updated:** 2026-03-23

---

## 1. Deploying to Production

Production deploys are **manual** — you choose when to promote a staging build.

### Step 1: Verify staging is working

Test the feature on https://staging.vernis9.art. Make sure everything works as expected.

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
3. Enter the image tag (full commit SHA)
4. Click "Run workflow"

### Step 4: Verify production

```bash
gh run list --workflow=deploy-production.yml --limit 1     # Check deploy status
curl -sf https://vernis9.art/api/artists | head -c 200
```

---

## 2. Rollback Procedures

### Option 1 — One-click rollback (recommended)

```bash
# Rolls back to the version that was running before the current deploy
gh workflow run rollback-production.yml
```

### Option 2 — Rollback to a specific version

```bash
# Find a known-good image tag
gh run list --workflow=ci.yml --status=success --limit 5

# Roll back to that specific tag
gh workflow run rollback-production.yml -f image_tag=<commit-sha>
```

### Option 3 — Emergency SSH rollback

```bash
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro
cd ~/app
cat .previous_image_tag                     # See the previous tag
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=<tag>/' .env
docker compose up -d --remove-orphans
```

**Note:** Rollback only affects the app image. If a database migration already ran, you may need to restore from a DB backup for destructive schema changes.

### Database migration mode (security)

Production uses `DB_MIGRATION_MODE=migrate` in `docker-compose.yml`. This means the app runs `drizzle-kit migrate` on startup, applying only versioned SQL files from the `migrations/` directory. This is a deliberate security choice — the alternative (`push` mode, used in staging) can destructively alter the schema without review, potentially dropping columns or tables. Migration mode ensures all schema changes are explicit, versioned, code-reviewed SQL files committed to git. (P1 fix — 2026-03-13, PR #85)

### Database backup (before destructive changes)

```bash
ssh -i ~/.ssh/artverse-deploy production@artverse.idata.ro \
  "cd ~/app && docker compose exec -T db pg_dump -U artverse artverse_production" > backup.sql
```

---

## 3. Staging/Production Down

```bash
# Restart containers
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose restart"

# Full recreate (if restart doesn't help)
ssh -i ~/.ssh/artverse-deploy staging@artverse.idata.ro \
  "cd ~/app && docker compose down && docker compose up -d"
```

---

## 4. VPS Access

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
| `/home/preview/app/` | Preview docker-compose + .env |
| `/etc/nginx/sites-enabled/` | Nginx configs (staging + production + preview) |
| `/etc/letsencrypt/` | SSL certificates (auto-renewed by certbot) |

### Docker project names

- `artverse-staging` — staging containers (`artverse-staging-app-1`, `artverse-staging-db-1`)
- `artverse-production` — production containers (`artverse-production-app-1`, `artverse-production-db-1`)
- `artverse-preview` — preview containers (`artverse-preview-app-1`, `artverse-preview-db-1`)

### Ports (all localhost-only)

| Port | Service |
|------|---------|
| 5003 | Staging app |
| 5435 | Staging PostgreSQL |
| 5002 | Production app |
| 5434 | Production PostgreSQL |
| 5004 | Preview app |
| 5436 | Preview PostgreSQL |

---

## 5. Docker Image Layout

The production Docker image is a multi-stage build (`Dockerfile`):

1. **deps** — installs all npm dependencies
2. **build** — compiles the app (`npm run build`)
3. **run** — production-only image with minimal footprint

### Build args

| Arg | Default | Purpose |
|-----|---------|---------|
| `APP_VERSION` | `dev` | Baked into the image as an env var. CI sets this to `github.run_number`. Used by the `/api/version` endpoint. |

### Files included in the image

| Path | Source |
|------|--------|
| `dist/` | Compiled client + server |
| `shared/` | Shared schema (needed by Drizzle at runtime) |
| `migrations/` | Versioned SQL migration files |
| `drizzle.config.ts` | Drizzle config for migration runner |
| `CHANGELOG.md` | Served by the version/changelog API endpoint |
| `docker-entrypoint.sh` | Entrypoint script (runs migrations then starts app) |

### Volume directories

The image creates these directories at build time. Docker-compose mounts named volumes over them so data persists across container restarts:

| Volume mount | Directories inside |
|---|---|
| `uploads:/app/uploads` | `artworks/`, `blog-covers/`, `avatars/` |
| `logs:/app/logs` | Structured pino log files |

---

## 6. GitHub Secrets

| Secret | Value | Purpose |
|--------|-------|---------|
| `DEPLOY_HOST` | `artverse.idata.ro` | VPS hostname |
| `DEPLOY_SSH_KEY` | ed25519 private key | SSH access for both users |
| `GITHUB_TOKEN` | Auto-provided | GHCR authentication |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Deploy notifications via Telegram |
| `TELEGRAM_CHAT_ID` | Numeric chat ID | Telegram chat for notifications |

Database passwords and session secrets are stored in `.env` files on the VPS, not in GitHub Secrets.

---

## 7. Notifications

Deploy notifications are sent to Telegram automatically. You'll receive a message for:

- **Staging deploys** — after every push to `main` (success or failure)
- **Preview deploys** — after every push to `redesign/v3` (success or failure)
- **Production deploys** — after manual deploy (success or failure)
- **Production rollbacks** — after rollback (success or failure)

Each notification includes the `@racu8_bot` tag, status, repo name, environment URL, image tag, and who triggered it.

**Setup:** Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` GitHub secrets. If not set, notifications are silently skipped.
