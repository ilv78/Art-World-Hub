# ADR-0002: VPS Hosting on Webdock

**Status:** Active
**Date:** 2026-03-10
**Owner:** Architecture

## Context

ArtVerse needs a hosting solution for staging and production environments. The project serves a 3D WebGL gallery requiring consistent performance. The developer prefers infrastructure they can control and learn from.

## Options Considered

1. **VPS on Webdock** — Single VPS with separate Linux users for staging/production
   - Pros: Full control, predictable costs, learning opportunity, Docker support
   - Cons: Manual setup, responsible for security/updates
2. **Managed platform (Railway/Render)** — Platform-as-a-service
   - Pros: Zero ops, auto-scaling, managed databases
   - Cons: Higher cost at scale, less control, vendor lock-in
3. **Cloud VMs (AWS EC2/GCP)** — Large cloud provider
   - Pros: Scalability, ecosystem integration
   - Cons: Complex pricing, overkill for current scale

## Decision

Single Webdock VPS with two Linux users (`staging` on port 5003, `production` on port 5002). Docker Compose per environment. Nginx reverse proxy with Certbot SSL. SSH deploy key shared across users.

## Consequences

- Positive: Predictable cost, full control over deployment, good learning experience
- Negative: Manual server management, single point of failure
- Risks: Need to handle backups, security updates, and scaling manually

## References

- `deploy/staging/docker-compose.yml` — Staging Docker config
- `deploy/production/docker-compose.yml` — Production Docker config
- `specs/workflows/DEPLOYMENT.md` — Deployment procedures
