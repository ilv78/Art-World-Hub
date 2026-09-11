# Vernis9 — Deployment Procedures

**Status:** Active
**Last Updated:** 2026-09-10

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

**Note:** Rollback only affects the app image — it does not touch data. If a database migration already ran and needs undoing, restore from the **pre-migration dump** that every production deploy now takes automatically (see §9), then redeploy:

```bash
# On the dev VPS — list what production has, newest first
ssh production 'ls -1t ~/backups/pre-deploy/*.dump | head'

# Dry run first: restore into a throwaway container and check row counts
scp production:~/backups/pre-deploy/<file>.dump /tmp/
~/app/deploy/backup/restore.sh --dump /tmp/<file>.dump --target scratch

# Then, if it looks right
~/app/deploy/backup/restore.sh --dump /tmp/<file>.dump --target production --i-mean-it
```

### Database migration mode (security)

Production uses `DB_MIGRATION_MODE=migrate` in `docker-compose.yml`. This means the app runs `drizzle-kit migrate` on startup, applying only versioned SQL files from the `migrations/` directory. This is a deliberate security choice — the alternative (`push` mode, used in staging) can destructively alter the schema without review, potentially dropping columns or tables. Migration mode ensures all schema changes are explicit, versioned, code-reviewed SQL files committed to git. (P1 fix — 2026-03-13, PR #85)

### Database backup (before destructive changes)

Scheduled backups run automatically (§9). For a one-off dump before doing something risky by hand:

```bash
# Preferred — same format and verification as the scheduled job
~/app/deploy/backup/pull-backup.sh db

# Or a plain SQL dump, ad hoc
ssh production "cd ~/app && docker compose exec -T db pg_dump -U artverse artverse_production" > backup.sql
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

The sudoers rules for both helpers (per `staging` and `production` user) live in `/etc/sudoers.d/nginx-deploy`:

```
<user> ALL=(root) NOPASSWD: /usr/local/bin/deploy-nginx-config
<user> ALL=(root) NOPASSWD: /usr/local/bin/remove-nginx-config
<user> ALL=(root) NOPASSWD: /usr/sbin/nginx -t
<user> ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload
```

### Response compression

Nginx is the source of truth for compressing responses to clients. The vernis9.art and staging.vernis9.art server blocks both have a `gzip on; gzip_proxied any;` directive set, so any text response from the upstream Express app (HTML, JSON, JS, CSS, SVG, WASM, XML) is gzipped on the way out unless it is already encoded. Express's own `compression` middleware still handles HTML inside the upstream — nginx detects the existing `Content-Encoding` and skips re-compressing — but the bundled `/assets/*` files served by Express's static middleware are uncompressed at the upstream layer and rely on nginx for compression. Brotli is not currently configured because the system nginx package (`nginx 1.24.0` on Ubuntu) is not built with the brotli module. See #550.

### Access log format (`detailed`)

The default nginx `combined` log_format omits the fields needed for latency analysis (`$request_time`, `$upstream_response_time`, `$body_bytes_sent`, `$gzip_ratio`, `$upstream_cache_status`). A custom `detailed` format is defined in `/etc/nginx/conf.d/log-format.conf` and source-controlled at `deploy/nginx/log-format.conf`. Each `vernis9.art` and `staging.vernis9.art` server block sets `access_log /var/log/nginx/<host>.access.log detailed;` so the dedicated detailed-format log file is separate from the global `access.log` (which keeps `combined` format and any pre-existing history). (#548)

Per-line format:

```
<ip> - <user> [<time>] "<request>" <status> bb=<bytes> "<referer>" "<ua>" rt=<request_time> urt=<upstream_response_time> cs=<cache_status> gzr=<gzip_ratio>
```

#### Where the file lives — shared-nginx today, per-machine future

`log_format` must live in nginx's `http {}` context, which is outside the per-site `sites-available/` files that `deploy-nginx-config` handles. So it ships as a separate file in `/etc/nginx/conf.d/log-format.conf` (loaded automatically before `sites-enabled/*`).

**Current topology — single VPS, one nginx, multiple env users.** Staging and production are both Linux users on the same Webdock VPS (`artverse.idata.ro`), each owning their own docker-compose stack on a different upstream port, but they share a single nginx instance and a single `/etc/nginx/` tree. `log-format.conf` is therefore a **per-machine** asset, **not** a per-environment asset:

- One copy in `/etc/nginx/conf.d/log-format.conf` serves every server block on this VPS.
- Install once from any sudo-capable env user (the file lands in a root-owned path either way); subsequent envs need nothing.

**Future topology — staging and production split onto separate VPS hosts.** When staging moves to its own machine, that host gets its own `/etc/nginx/` tree and its own copy of `log-format.conf`. The install procedure below is written so it works for either topology: do it once per machine that runs nginx.

#### One-time per-machine install

This step is **outside the passwordless sudo allowlist** and will prompt for the sudo password:

```bash
# 1. SCP to the env user's home — /tmp/ can collide with other users on shared VPS
scp deploy/nginx/log-format.conf <env-user>@<host>:~/log-format.conf

# 2. Install to /etc/nginx/conf.d/ (sudo password prompt — outside NOPASSWD)
ssh <env-user>@<host>
sudo cp ~/log-format.conf /etc/nginx/conf.d/log-format.conf
sudo chown root:root /etc/nginx/conf.d/log-format.conf
sudo chmod 644 /etc/nginx/conf.d/log-format.conf

# 3. Validate + reload (these ARE passwordless)
sudo nginx -t && sudo nginx -s reload
```

On the shared-VPS setup, **skip steps 1–2 for any additional env user on the same VPS** — the file is already in place. Per-site configs (`vernis9.art.conf`, `staging.vernis9.art.conf`) still deploy normally via `deploy-nginx-config` for every env, since each one is a separate server block.

Re-installing the format file is only needed when the format itself changes.

### Edge-level probe blocking

The `vernis9.art` and `staging.vernis9.art` server blocks `return 444` for known scanner probe paths (`.env`, `.git`, `.aws`, `.boto`, `.svn`, `.hg`, `wp-admin`, `wp-login.php`, `wp-includes`, `xmlrpc.php`, `phpinfo.php`, `phpmyadmin`). `444` is nginx-specific: it closes the TCP connection with no HTTP response, which is faster than `404` and skips logging request-body buffering. These bursts otherwise dominate the upstream log noise. (#548)

If a real path ever needs to start with `.` or a WP-like prefix, the regex must be loosened before adding the route — otherwise nginx will silently drop it.

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
| `logs:/app/logs` | Structured pino log files — rotated since #738: `app.1.log`, `app.2.log`, … 10 MB each, 10 kept (~100 MB ceiling). `app.log` without a number is a pre-#738 file; an operator tailing logs wants the highest-numbered one. |

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

---

## 9. Backups & Restore

Added in #682. Before this, the platform had no backups of any kind — a lost Docker volume meant losing every order, user, artist and artwork permanently.

### Topology

Backups are **pulled** by the dev VPS from production and staging over the existing `ssh production` / `ssh staging` aliases.

| | Host | Webdock node |
|---|---|---|
| Production + staging | `artverse.idata.ro` | `ilc01node02` |
| Backup target (dev VPS) | dev box | `ilc01node03` |

Pull, not push, is deliberate: production holds no credentials for the dev VPS and cannot reach or delete the backup history. A compromised or misbehaving production box cannot destroy its own backups.

**Known limitation:** both nodes are Webdock, same account. This protects against a lost volume, a bad migration, a compose mixup or a disk failure on node02 — it does **not** protect against provider-wide failure or account lockout. `pull-backup.sh` has a `BACKUP_REMOTE` hook (rclone) that adds a genuine off-provider copy when we want one; it is unset today.

### What runs, and when

| Job | Schedule (UTC) | Covers |
|---|---|---|
| `artverse-backup.sh db` | every 12h (00:00, 12:00) | production DB + staging DB |
| `artverse-backup.sh uploads` | daily 03:30 | production `uploads` volume |
| Pre-migration dump | every production deploy | production DB, before migrations apply |

Worst-case data loss (RPO): **12 hours** for the database, 24 hours for uploaded images. Point-in-time recovery (WAL archiving) is deliberately out of scope.

### Where things live

| Path (dev VPS) | Contents |
|---|---|
| `~/backups/prod/db/` | production dumps, `pg_dump -Fc` |
| `~/backups/prod/uploads/current/` | mirror of the live uploads volume |
| `~/backups/prod/uploads/snapshots/` | dated hardlink snapshots |
| `~/backups/staging/db/` | staging dumps |
| `~/backups/logs/backup.log` | cron output |
| `~/.config/artverse-backup.env` | Telegram credentials + config overrides (chmod 600, never committed) |
| `~/bin/artverse-backup.sh` | installed copy of `deploy/backup/pull-backup.sh` |
| `~/backups/pre-deploy/` **on production** | pre-migration dumps, last 10 |

**The cron runs `~/bin/artverse-backup.sh`, not the repo copy.** The repo working tree on the dev VPS changes branch and gets `git reset --mixed HEAD~1` under the `resume` workflow (see MULTI-DEVICE.md) — a cron pointed into it would silently run whatever happened to be checked out. After changing `deploy/backup/pull-backup.sh`, re-copy it:

```bash
cp ~/app/deploy/backup/pull-backup.sh ~/bin/artverse-backup.sh
```

### Retention

Grandfather-father-son on the production database: every dump for 30 days, then one per ISO week for 12 weeks, then one per month for 12 months. Uploads keep 30 daily hardlink snapshots; staging keeps 7 dumps.

Measured 2026-09-10: a production dump is **48 KB** (8.8 MB database, `-Fc` compressed) and the uploads volume is **138 MB** across 458 files. Because snapshots are hardlinked, 30 of them cost ~138 MB plus whatever artwork was added — not 30 × 138 MB. Steady state is well under 1 GB against 22 GB free. The script aborts and alerts rather than filling the disk below 5 GB free.

### Failure alerts

`pull-backup.sh` messages Telegram **on failure only**, via the same `@racu8_bot` as CI. Credentials live in `~/.config/artverse-backup.env` on the dev VPS — cron has no access to GitHub Actions secrets. If those are blank, failures are logged but silent.

Every dump is read back with `pg_restore --list` before being kept, and an uploads transfer producing zero files is rejected rather than overwriting the mirror — a dropped SSH stream otherwise leaves a truncated backup that only reveals itself at restore time.

### Restore drill

Restoring into a throwaway container touches nothing real and is safe to run any time:

```bash
~/app/deploy/backup/restore.sh --dump ~/backups/prod/db/<timestamp>.dump --target scratch
```

It prints row counts for `users`, `artists`, `artworks`, `orders`, `auctions`, `bids`. Compare against live production:

```bash
ssh production 'cd ~/app && docker compose exec -T db psql -U artverse -d artverse_production -c "SELECT count(*) FROM artworks;"'
```

**Drill log** — run one at least every quarter, and record it here:

| Date | Dump | Result |
|---|---|---|
| 2026-09-10 | `20260910T191523Z.dump` | Pass — 3 users, 1 artist, 44 artworks, 3 orders; matched live production exactly |

### Restoring for real

```bash
# Staging — destructive to staging, no extra flag needed
~/app/deploy/backup/restore.sh --dump <file> --target staging

# Production — requires --i-mean-it AND typing the database name at the prompt.
# Stops the app container first so nothing writes mid-restore, then restarts it.
~/app/deploy/backup/restore.sh --dump <file> --target production --i-mean-it
```

### Restoring uploaded images

The uploads mirror is plain files — copy them straight back into the volume:

```bash
tar -cf - -C ~/backups/prod/uploads/snapshots/<timestamp> . \
  | ssh production 'docker run --rm -i -v artverse-production_uploads:/data alpine tar -xf - -C /data'
```
