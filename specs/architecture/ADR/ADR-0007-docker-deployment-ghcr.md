# ADR-0007: Docker-Based Deployment with GHCR

**Status:** Active
**Date:** 2026-03-10
**Owner:** Architecture

## Context

ArtVerse needs a consistent deployment mechanism across staging and production environments on a single VPS. The build process involves Vite (client) + esbuild (server) bundling, and the runtime needs Node.js + PostgreSQL.

## Options Considered

1. **Docker + GHCR** — Build Docker image in CI, push to GitHub Container Registry, pull on VPS
   - Pros: Consistent builds, version-tagged images, easy rollback, CI integration
   - Cons: Image build time, registry storage
2. **Direct deploy (rsync/scp)** — Copy built artifacts to VPS
   - Pros: Simple, fast
   - Cons: No image versioning, harder rollback, environment drift
3. **Kubernetes** — Container orchestration
   - Pros: Auto-scaling, self-healing
   - Cons: Massive overkill for single VPS, complex setup

## Decision

Docker-based deployment with images pushed to GitHub Container Registry (GHCR). CI builds and tags images with commit SHA. VPS pulls images via SSH deploy. Docker Compose per environment with PostgreSQL sidecar. Dual-mode database migrations via `docker-entrypoint.sh`.

Key deployment features:
- Staging: auto-deploy on push to main, push mode for DB
- Production: manual trigger via GitHub Actions, migration mode for DB
- Rollback: `.previous_image_tag` file saves state, one-click rollback workflow
- Telegram notifications on deploy/rollback events

## Consequences

- Positive: Reproducible builds, version-tagged images, instant rollback, consistent environments
- Negative: Docker image build adds ~2 min to CI; GHCR storage usage
- Risks: VPS disk space for Docker images (mitigated by periodic cleanup)

## References

- `Dockerfile` — Multi-stage build
- `docker-entrypoint.sh` — Dual-mode DB setup
- `.github/workflows/ci.yml` — CI/CD pipeline
- `.github/workflows/deploy-production.yml` — Production deploy
- `.github/workflows/rollback-production.yml` — Rollback workflow
- `specs/workflows/CI-CD.md` — Pipeline documentation
- `specs/workflows/DEPLOYMENT.md` — Deployment procedures
