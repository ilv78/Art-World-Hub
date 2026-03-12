# ADR-0001: Monolithic Architecture (Express + React + PostgreSQL)

**Status:** Active
**Date:** 2026-02-01
**Owner:** Architecture

## Context

ArtVerse needs a full-stack architecture for an art gallery platform with 3D rendering, marketplace, auctions, and artist dashboards. The project is developed by a solo developer. Key considerations: development speed, deployment simplicity, and the ability to share types and schemas between frontend and backend.

## Options Considered

1. **Monolith (Express + React + PostgreSQL)** — Single codebase, shared types, simple deployment
   - Pros: Fast development, shared schema (Drizzle + Zod), single Docker image, easy debugging
   - Cons: Scaling requires scaling everything, tighter coupling
2. **Microservices** — Separate services for gallery, marketplace, auth, etc.
   - Pros: Independent scaling, technology flexibility
   - Cons: Massive overhead for solo dev, complex deployment, no type sharing
3. **Serverless (Lambda/Vercel)** — Function-based backend
   - Pros: Auto-scaling, no server management
   - Cons: Cold starts affect 3D gallery experience, complex local dev, vendor lock-in

## Decision

Monolithic architecture with Express 5 backend, React 18 frontend (Vite), and PostgreSQL 16. Shared `schema.ts` serves as single source of truth for both database schema (Drizzle ORM) and API validation types (Zod). Single Docker image deployed to VPS.

## Consequences

- Positive: Rapid feature development with full-stack type safety; simple CI/CD pipeline; shared storage layer used by both routes and MCP server
- Negative: Cannot independently scale frontend vs backend; large single codebase
- Risks: May need to extract services if traffic patterns diverge significantly

## References

- `shared/schema.ts` — Shared types and schema
- `server/routes.ts` — Express API handlers
- `client/` — React frontend
