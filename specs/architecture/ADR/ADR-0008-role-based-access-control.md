# ADR-0008: Role-Based Access Control

**Status:** Active
**Date:** 2026-03-13
**Owner:** Architecture

## Context

ArtVerse needs an admin section (#8) to manage platform content and a curator role (#7) for gallery/exhibition management. Currently all users are treated equally — authorization is purely ownership-based (artist manages their own resources).

## Options Considered

1. **Simple role column** — `role` varchar on `users` table with `user`, `curator`, `admin` values
   - Pros: Simple, easy to query, covers current needs
   - Cons: Limited granularity
2. **Permissions table** — Many-to-many `user_permissions` with individual permissions
   - Pros: Fine-grained control
   - Cons: Over-engineered for 3 roles, complex queries
3. **Role + permissions hybrid** — Roles map to permission sets
   - Pros: Flexible
   - Cons: Unnecessary complexity at this stage

## Decision

Simple `role` varchar column on `users` table. Three roles: `user` (default), `curator`, `admin`. Enforced via `isAdmin` middleware on admin routes. The first admin is set via database migration for `liviu.iusan@gmail.com`. Admins can promote other users via API.

Role hierarchy:
- **user** — Standard user, can manage own resources
- **curator** — Can create/manage galleries and exhibitions (future: issue #7)
- **admin** — Full platform management: delete any resource, manage user roles

## Consequences

- Positive: Simple to implement, easy to understand, extensible to curator role
- Negative: No fine-grained permissions (acceptable for current scale)
- Risks: Role escalation — mitigated by requiring admin role to change roles

## References

- `shared/models/auth.ts` — Role column definition
- `server/routes.ts` — Admin endpoints
- `specs/features/admin-section/SPEC.md` — Feature specification
