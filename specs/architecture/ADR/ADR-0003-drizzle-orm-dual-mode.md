# ADR-0003: Drizzle ORM with Dual-Mode Schema Management

**Status:** Active
**Date:** 2026-03-10
**Owner:** Architecture

## Context

ArtVerse needs a database ORM that provides type safety and integrates with the TypeScript monolith. Schema changes need different handling in staging (fast iteration) vs production (safe, versioned).

## Options Considered

1. **Drizzle ORM with dual mode (push + migrate)** — Push for staging, migrations for production
   - Pros: Type-safe queries, Zod integration, fast staging iteration, safe production deploys
   - Cons: Two workflows to maintain
2. **Prisma** — Popular TypeScript ORM
   - Pros: Large ecosystem, visual schema editor
   - Cons: Generated client adds build step, heavier runtime
3. **Raw SQL + pg driver** — Direct PostgreSQL queries
   - Pros: Maximum control, no ORM overhead
   - Cons: No type safety, manual migration management

## Decision

Drizzle ORM with two modes controlled by `DB_MIGRATION_MODE` env var in `docker-entrypoint.sh`:
- **Staging:** `drizzle-kit push --force` — Auto-applies schema changes on container start, staging data is disposable
- **Production:** `drizzle-kit migrate` — Applies versioned SQL migration files from `migrations/`

Schema defined in `shared/schema.ts`, shared between server and client for full type safety.

## Consequences

- Positive: Type-safe queries with Zod validation; fast staging iteration; safe, auditable production changes
- Negative: Must generate and commit migration files before production deploy
- Risks: Push mode can destructively alter staging data (acceptable since staging is disposable)

## References

- `shared/schema.ts` — Schema definitions
- `migrations/` — SQL migration files
- `docker-entrypoint.sh` — Dual-mode logic
- `specs/architecture/DATA-MODEL.md` — Schema documentation
