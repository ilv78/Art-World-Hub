# Vernis9 — Deployment Procedures

**Status:** Active
**Last Updated:** 2026-03-23

---

## 1. Deploying to Production

Production deploys are **manual** — you choose when to promote a staging build.

> **⚠️ If this is a versioned release (vX.Y.Z):** Update CHANGELOG.md and merge to `main` BEFORE tagging and deploying. The changelog is baked into the Docker image — deploying before updating it will serve stale version info on `/changelog` and `/api/version`. See `specs/workflows/VERSIONING.md` for the full release checklist.

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
| `/etc/nginx/sites-available/` | Nginx config files (source of truth) |
| `/etc/nginx/sites-enabled/` | Nginx symlinks to sites-available |
| `/etc/letsencrypt/` | SSL certificates (auto-renewed by certbot) |
| `/usr/local/bin/deploy-nginx-config` | Helper script for nginx config deployment |
| `/usr/local/bin/remove-nginx-config` | Helper script for nginx config removal (companion to deploy-nginx-config) |
| `/etc/nginx/.removed/` | Backup directory for configs removed via `remove-nginx-config` |

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

### Runtime environment variables (docker-compose)

All environments share the same Docker image. Behavior differences are controlled by environment variables set in each docker-compose file:

| Variable | Staging | Preview | Production | Purpose |
|----------|---------|---------|------------|---------|
| `SITE_URL` | `https://staging.vernis9.art` | `https://preview.vernis9.art` | `https://vernis9.art` | Canonical URLs, OG tags, sitemap links, crawler blocking |
| `DB_MIGRATION_MODE` | _(unset — uses push)_ | _(unset — uses push)_ | `migrate` | Schema migration strategy |
| `NODE_ENV` | `production` | `production` | `production` | All deployed environments run in production mode |

**SEO crawler blocking:** When `SITE_URL` is not `https://vernis9.art`, the app automatically:
- Adds `<meta name="robots" content="noindex, nofollow">` to all pages
- Adds `X-Robots-Tag: noindex, nofollow` HTTP header to all responses
- Omits the Sitemap directive from `robots.txt`

This ensures only production is indexed by search engines. Google Rich Results Test can still fetch staging pages for validation (the noindex signals prevent indexing but don't block fetching).

---

## 5. Nginx Config Deployment

The `staging` and `production` VPS users have passwordless sudo access to deploy nginx configs via a helper script. This allows CI or SSH-based tooling to update nginx without root access.

### Deploy a config

```bash
# 1. SCP the config file to the VPS
scp /path/to/config.conf production:/tmp/config.conf

# 2. Deploy it (copies to sites-available, symlinks to sites-enabled, tests, reloads)
ssh production "sudo deploy-nginx-config /tmp/config.conf vernis9.art.conf"
```

The script automatically:
- Backs up the existing config before overwriting
- Runs `nginx -t` to validate the new config
- Reloads nginx on success
- Rolls back to the previous config if `nginx -t` fails

### Test nginx without deploying

```bash
ssh production "sudo nginx -t"
```

### Reload nginx manually

```bash
ssh production "sudo nginx -s reload"
```

### Remove a config

```bash
# Removes both sites-enabled/<name> and sites-available/<name>,
# backs up to /etc/nginx/.removed/<name>.<timestamp>, tests, reloads,
# and restores from backup if nginx -t fails.
ssh production "sudo remove-nginx-config preview.artverse.idata.ro.conf"
```

The remove helper:
- Validates the name pattern (no path traversal)
- Refuses if sites-enabled/`<name>` is a symlink pointing outside `sites-available/` (manual cleanup required for unusual configs)
- Shares the `/var/lock/deploy-nginx-config.lock` flock with `deploy-nginx-config` so the two helpers can't race
- Backs up the config content to `/etc/nginx/.removed/` before deleting, and restores on `nginx -t` failure

### Script sources

Both helpers are version-controlled in `deploy/nginx/`:

- `deploy/nginx/deploy-nginx-config.sh` → `/usr/local/bin/deploy-nginx-config`
- `deploy/nginx/remove-nginx-config.sh` → `/usr/local/bin/remove-nginx-config`

If they need updating:

```bash
scp deploy/nginx/deploy-nginx-config.sh production:/tmp/deploy-nginx-config
scp deploy/nginx/remove-nginx-config.sh production:/tmp/remove-nginx-config
# Then on the VPS as root:
# cp /tmp/deploy-nginx-config /usr/local/bin/deploy-nginx-config && chmod 755 /usr/local/bin/deploy-nginx-config
# cp /tmp/remove-nginx-config /usr/local/bin/remove-nginx-config && chmod 755 /usr/local/bin/remove-nginx-config
```

The sudoers rules for both helpers (per `staging` and `production` user) live in `/etc/sudoers.d/`:

```
<user> ALL=(root) NOPASSWD: /usr/local/bin/deploy-nginx-config
<user> ALL=(root) NOPASSWD: /usr/local/bin/remove-nginx-config
<user> ALL=(root) NOPASSWD: /usr/sbin/nginx -t
<user> ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload
```

---

## 6. Docker Image Layout

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

## 7. GitHub Secrets

| Secret | Value | Purpose |
|--------|-------|---------|
| `DEPLOY_HOST` | `artverse.idata.ro` | VPS hostname |
| `DEPLOY_SSH_KEY` | ed25519 private key | SSH access for both users |
| `GITHUB_TOKEN` | Auto-provided | GHCR authentication |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Deploy notifications via Telegram |
| `TELEGRAM_CHAT_ID` | Numeric chat ID | Telegram chat for notifications |

Database passwords and session secrets are stored in `.env` files on the VPS, not in GitHub Secrets.

---

## 8. Notifications

Deploy notifications are sent to Telegram automatically. You'll receive a message for:

- **Staging deploys** — after every push to `main` (success or failure)
- **Preview deploys** — after every push to `redesign/v3` (success or failure)
- **Production deploys** — after manual deploy (success or failure)
- **Production rollbacks** — after rollback (success or failure)

Each notification includes the `@racu8_bot` tag, status, repo name, environment URL, image tag, and who triggered it.

**Setup:** Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` GitHub secrets. If not set, notifications are silently skipped.
