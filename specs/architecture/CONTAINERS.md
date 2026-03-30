# ArtVerse — Container Architecture

**Status:** Active
**Last Updated:** 2026-03-30
**Owner:** Architecture

---

## 1. Overview

ArtVerse runs on a single VPS with three isolated environments (staging, production, preview), each composed of the same two-container stack. Nginx on the host acts as the reverse proxy and TLS terminator for all environments.

```
                          Internet
                             |
                        +---------+
                        |   DNS   |
                        +---------+
                        /    |    \
                       /     |     \
        vernis9.art   staging.     preview.
                      vernis9.art  vernis9.art
                        \    |    /
                         v   v   v
  +=======================================================+
  |                    VPS (Host)                          |
  |                                                        |
  |   +------------------+                                 |
  |   |   Nginx (host)   |   TLS termination (Certbot)     |
  |   |   port 80/443    |                                 |
  |   +--------+---------+                                 |
  |            |                                           |
  |   +--------+----------+----------+                     |
  |   |        |          |          |                     |
  |   | :5002  |  :5003   |  :5004   |  (loopback only)   |
  |   v        v          v          v                     |
  |                                                        |
  |  +-- Production --+  +-- Staging ----+  +-- Preview --+|
  |  | /home/prod/app |  | /home/stg/app |  | /home/prv/  ||
  |  |                |  |               |  |    app      ||
  |  | +-----------+  |  | +-----------+ |  | +---------+ ||
  |  | |    app    |  |  | |    app    | |  | |   app   | ||
  |  | | node:25   |  |  | | node:25   | |  | | node:25 | ||
  |  | | :5000     |  |  | | :5000     | |  | | :5000   | ||
  |  | +-----+-----+  |  | +-----+-----+ |  | +----+----+ ||
  |  |       |         |  |       |        |  |      |      ||
  |  | +-----+-----+  |  | +-----+-----+ |  | +----+----+ ||
  |  | |    db     |  |  | |    db     | |  | |   db    | ||
  |  | | pg:16     |  |  | | pg:16     | |  | | pg:16   | ||
  |  | | :5432     |  |  | | :5432     | |  | | :5432   | ||
  |  | +-----------+  |  | +-----------+ |  | +---------+ ||
  |  +-----------------+  +---------------+  +------------+|
  |                                                        |
  +=======================================================+
```

---

## 2. Container Stack

Each environment runs an identical two-service Docker Compose stack:

### `app` — Application Server

| Property | Value |
|---|---|
| Image | `ghcr.io/ilv78/art-world-hub:<commit-sha>` |
| Base | `node:25-bookworm-slim` (multi-stage build) |
| Internal port | 5000 |
| User | `appuser:appgroup` (non-root) |
| Entrypoint | `docker-entrypoint.sh` (runs DB migrations, then `node dist/index.cjs`) |
| Volumes | `uploads` (`/app/uploads` — artworks, blog-covers, avatars), `logs` (`/app/logs`) |
| Health check | `GET /health` (HTTP 200) |

### `db` — PostgreSQL

| Property | Value |
|---|---|
| Image | `postgres:16-alpine` |
| Internal port | 5432 |
| Volume | `pgdata` (`/var/lib/postgresql/data`) |
| Health check | `pg_isready` (5s interval, 3s timeout, 20 retries) |

The `app` container depends on `db` with `condition: service_healthy` — it will not start until PostgreSQL is ready.

---

## 3. Environment Matrix

All host ports are bound to `127.0.0.1` only (not externally accessible). Nginx proxies public traffic.

| Environment | Compose Project | App Host Port | DB Host Port | DB Name | DB Mode | Deploy Trigger | Domain |
|---|---|---|---|---|---|---|---|
| **Local dev** | `docker-compose.dev.yml` | — | 5433 | `artverse_dev` | — | Manual | localhost |
| **Local full** | `docker-compose.yml` | 5000 | 5433 | (from .env) | push | Manual | localhost |
| **Staging** | `artverse-staging` | 5003 | 5435 | `artverse_staging` | push | Auto (main push) | staging.vernis9.art |
| **Preview** | `artverse-preview` | 5004 | 5436 | `artverse_preview` | push | Auto (redesign/v3 push) | preview.vernis9.art |
| **Production** | `artverse-production` | 5002 | 5434 | `artverse_production` | migrate | Manual (workflow_dispatch) | vernis9.art |

### Database Mode

The entrypoint script (`docker-entrypoint.sh`) supports two modes controlled by `DB_MIGRATION_MODE`:

- **`push`** (default) — runs `drizzle-kit push --force` to sync schema directly. Used in staging and preview.
- **`migrate`** — runs `drizzle-kit migrate` to apply versioned SQL migrations from `migrations/`. Used in production.

---

## 4. Nginx Reverse Proxy

Nginx runs directly on the host (not containerized). Each environment has a server block in `/etc/nginx/sites-enabled/`:

| Config File | Domain | Upstream |
|---|---|---|
| `artverse.idata.ro.conf` | `vernis9.art` | `http://127.0.0.1:5002` |
| `staging.artverse.idata.ro.conf` | `staging.vernis9.art` | `http://127.0.0.1:5003` |
| `preview.artverse.idata.ro.conf` | `preview.vernis9.art` | `http://127.0.0.1:5004` |

> **Note:** The Nginx config filenames in the repo still reference `artverse.idata.ro` (the original domain). The live server configs have been updated to serve `vernis9.art`.

All configs:
- Proxy HTTP/1.1 with WebSocket upgrade support (`Upgrade` + `Connection` headers)
- Forward real client IP via `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- 86400s (24h) read timeout for long-lived connections
- TLS handled by Certbot (Let's Encrypt), configured outside of the repo

---

## 5. VPS User Isolation

Each environment runs under its own Linux user, providing filesystem and process isolation:

| User | Home Directory | Purpose |
|---|---|---|
| `staging` | `/home/staging/app/` | Staging environment |
| `production` | `/home/production/app/` | Production environment |
| `preview` | `/home/preview/app/` | Preview environment |

All users are in the `docker` group. Each user's `~/app/` directory contains:
- `docker-compose.yml` — environment-specific compose file
- `.env` — environment variables (secrets, `IMAGE_TAG`)
- `.previous_image_tag` — rollback state (production only)

Setup is automated by `deploy/server-setup.sh`.

---

## 6. Docker Image Lifecycle

```
  Developer pushes to main
          |
          v
  +------------------+
  | GitHub Actions CI |
  | (ci.yml)         |
  +--------+---------+
           |
  lint -> type check -> test -> build -> migration drift check
           |
           v (only if code changed)
  +------------------+
  | Build & Push     |
  | Docker Image     |
  +--------+---------+
           |
           |  ghcr.io/ilv78/art-world-hub:<sha>
           |  ghcr.io/ilv78/art-world-hub:<run-number>
           |  ghcr.io/ilv78/art-world-hub:latest
           |
           v
  +------------------+
  | Trivy Scan       |  CRITICAL/HIGH vuln check
  +--------+---------+
           |
     +-----+-----+
     |           |
     v           v
  Staging     Preview
  (main)      (redesign/v3)
```

### Image Tags

Each build produces three tags:

| Tag | Example | Purpose |
|---|---|---|
| `:<commit-sha>` | `:a1b2c3d...` | Immutable, used for deploys and rollback |
| `:<run-number>` | `:142` | Human-readable release number |
| `:latest` | `:latest` | Convenience, not used for deploys |

### Multi-Stage Dockerfile

```
Stage 1: deps      node:25-bookworm-slim   npm ci (all deps)
Stage 2: build     node:25-bookworm-slim   Vite + esbuild production build
Stage 3: run       node:25-bookworm-slim   npm ci --omit=dev + dist/ + migrations/
```

Final image runs as non-root `appuser:appgroup`.

---

## 7. Deploy Flow

### Staging (automatic)

```
main push --> CI passes --> Image built --> Trivy scan --> SSH to VPS as staging
  1. docker pull ghcr.io/ilv78/art-world-hub:<sha>
  2. Update IMAGE_TAG in .env
  3. Ensure upload/log directories exist
  4. docker compose up -d --remove-orphans
  5. Run drizzle-kit migrate inside container
  6. Health check loop (up to 60s)
  7. External smoke tests (health, version, changelog, logs)
  8. Tag release in git (release-<run-number>)
  9. Telegram notification
```

### Production (manual)

```
Manual workflow_dispatch --> SSH to VPS as production
  1. Save current IMAGE_TAG to .previous_image_tag
  2. docker pull ghcr.io/ilv78/art-world-hub:<tag>
  3. Update IMAGE_TAG in .env
  4. docker compose up -d --remove-orphans
  5. Health check
  6. Telegram notification
```

### Rollback (one-click)

```
rollback-production.yml --> SSH to VPS as production
  1. Read .previous_image_tag
  2. Restore IMAGE_TAG in .env
  3. docker compose up -d --remove-orphans
  4. Telegram notification
```

---

## 8. Volume Persistence

Each environment maintains three named Docker volumes:

| Volume | Mount Path | Contents |
|---|---|---|
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL data directory |
| `uploads` | `/app/uploads/` | User-uploaded files (artworks, blog-covers, avatars) |
| `logs` | `/app/logs/` | Structured JSON application logs (`app.log`) |

Volumes survive container recreation (`docker compose up -d` preserves them). They are scoped per Compose project, so each environment's data is fully isolated.

---

## 9. Network Topology

Each Docker Compose stack creates its own bridge network. Containers within a stack communicate by service name:

```
app --> db:5432    (internal Docker network, by service name)
```

No cross-environment container communication exists. The only external access path is:

```
Internet --> Nginx (:443) --> 127.0.0.1:<env-port> --> app container (:5000) --> db (:5432)
```

---

## 10. Local Development

Two Compose files support local development:

| File | Purpose | Containers |
|---|---|---|
| `docker-compose.dev.yml` | DB only — run app natively with `npm run dev` | `db` (pg:16, port 5433) |
| `docker-compose.yml` | Full stack — mirrors deployed environments | `db` + `app` (port 5000) |

Typical workflow: use `docker-compose.dev.yml` for the database, run the app with `npm run dev` for hot reload.

---

## References

- `Dockerfile` — Multi-stage image build
- `docker-entrypoint.sh` — DB migration/push entrypoint
- `docker-compose.yml` — Local full-stack
- `docker-compose.dev.yml` — Local DB only
- `deploy/staging/docker-compose.yml` — Staging compose
- `deploy/production/docker-compose.yml` — Production compose
- `deploy/preview/docker-compose.yml` — Preview compose
- `deploy/nginx/*.conf` — Nginx reverse proxy configs
- `deploy/server-setup.sh` — VPS user and SSH setup
- `deploy/deploy.sh` — Generic deploy script
- `.github/workflows/ci.yml` — CI/CD pipeline (build, scan, deploy)
- `.github/workflows/deploy-production.yml` — Production deploy
- `.github/workflows/rollback-production.yml` — Production rollback
- `specs/architecture/ADR/ADR-0007-docker-deployment-ghcr.md` — Decision record
