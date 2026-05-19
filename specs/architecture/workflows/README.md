# User Role Workflows

**Status:** Active
**Last Updated:** 2026-05-19
**Owner:** Architecture

Mermaid workflow diagrams for each user role on the ArtVerse platform. Roles map to `USER_ROLES` in `shared/models/auth.ts` (`user`, `curator`, `admin`); the **visitor** role is implicit (unauthenticated public access).

## Diagrams

| Role | Description | File |
|------|-------------|------|
| Visitor | Unauthenticated public browsing, cart, checkout | [visitor.md](./visitor.md) |
| Artist | `role=user` with an artist profile — upload, exhibit, sell, fulfill | [artist.md](./artist.md) |
| Curator | `role=curator` — assemble curated galleries from exhibition-ready artworks | [curator.md](./curator.md) |
| Admin | `role=admin` — user/role management, content moderation, settings | [admin.md](./admin.md) |

## Cross-cutting

| Topic | Description | File |
|-------|-------------|------|
| Order lifecycle | State machine shared by visitor checkout and artist fulfillment | [order-lifecycle.md](./order-lifecycle.md) |

## Conventions

- Diagrams use `flowchart TD` for journeys and `stateDiagram-v2` for lifecycles.
- Each file links to the relevant route handlers (`server/routes.ts`) and pages (`client/src/pages/`) so the diagram and code stay traceable.
- Update the diagram in the same PR as the role/route change that affects it. The Documentation Agent (`specs/DOC-AGENT-SPEC.md`) enforces this.
