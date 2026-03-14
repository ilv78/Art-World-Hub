# ADR-0008: Role-Based Access Control (RBAC)

**Status:** Accepted
**Date:** 2026-03-14
**Decision:** Add a `role` column to the `users` table with three roles: `user`, `curator`, `admin`.

## Context

ArtVerse had no admin capabilities — every authenticated user had the same permissions. Platform management (deleting inappropriate content, managing users) required direct database access. Issue [#8](https://github.com/ilv78/Art-World-Hub/issues/8) requested an admin section.

## Decision

- Add `role` varchar column to `users` table, defaulting to `"user"`, with three values: `user`, `curator`, `admin`.
- Implement `isAdmin` Express middleware that checks the user's role from the database on every admin request.
- Admin endpoints live under `/api/admin/*` with dedicated routes for users, artists, artworks, exhibitions, and blog posts.
- The admin page is a client-side route (`/admin`) that checks `user.role` before rendering.
- Sidebar link to admin is conditionally rendered only for admin users.

## Alternatives Considered

1. **Separate admin app** — rejected as over-engineering for a single-developer project.
2. **Permission-based system (fine-grained)** — rejected; three roles are sufficient for current needs. Can be extended later.
3. **Boolean `isAdmin` flag** — rejected in favor of a role column to support the intermediate `curator` role.

## Consequences

- Migration `0002_noisy_iron_monger.sql` adds `role` column with default `"user"` — no data loss, backwards compatible.
- All existing users default to `"user"` role — admin must be set manually via database or through the admin UI by an existing admin.
- The `isAdmin` middleware queries the database on every admin request — acceptable for admin-frequency traffic.
- The `curator` role is defined but not yet enforced — reserved for future use (e.g., exhibition curation permissions).
