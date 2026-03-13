# Feature: Admin Section

**Status:** In Progress
**Last Updated:** 2026-03-13
**Owner:** Architecture
**Issue:** #8

## Summary

Role-based access control system with three roles (admin, curator, user) and an admin panel for managing artists, artworks, and exhibitions. Admins can delete any resource and promote users to other roles.

## User Story

As an admin, I want to manage all platform content (artists, artworks, exhibitions) and assign roles to users, so that I can maintain the platform and delegate responsibilities.

## Decisions

1. **Three roles:** `admin`, `curator`, `user` (default). Curator can create/manage galleries and exhibitions. Admin has full access.
2. **Hard delete** with cascade for all admin delete operations.
3. **First admin:** Set via seed/migration for `liviu.iusan@gmail.com`. Subsequent admins promoted via admin UI + API endpoint.
4. **"Delete galleries"** from the issue means delete exhibitions.

## Acceptance Criteria

- [ ] `role` column added to `users` table with values `user`, `curator`, `admin` (default: `user`)
- [ ] `isAdmin` middleware rejects non-admin users with 403
- [ ] Admin API: `GET /api/admin/users` — list all users with roles
- [ ] Admin API: `PATCH /api/admin/users/:id/role` — change user role
- [ ] Admin API: `DELETE /api/admin/artworks/:id` — hard delete artwork with cascade
- [ ] Admin API: `DELETE /api/admin/artists/:id` — hard delete artist with cascade
- [ ] Admin API: `DELETE /api/admin/exhibitions/:id` — hard delete exhibition with cascade
- [ ] Admin API: `GET /api/admin/artists` — list all artists
- [ ] Admin API: `GET /api/admin/artworks` — list all artworks
- [ ] Admin API: `GET /api/admin/exhibitions` — list all exhibitions
- [ ] Admin page at `/admin` with tabs for Users, Artists, Artworks, Exhibitions
- [ ] Admin link in sidebar visible only to admin users
- [ ] First admin (`liviu.iusan@gmail.com`) set via migration
- [ ] `user.role` exposed to frontend via `/api/auth/user`

## Technical Design

### Architecture

- Schema change: Add `role` varchar column to `users` table in `shared/models/auth.ts`
- Middleware: `isAdmin` in `server/replit_integrations/auth/replitAuth.ts`
- Routes: Admin endpoints in `server/routes.ts` under `/api/admin/*`
- Storage: `deleteArtist()`, `deleteExhibition()` methods in `server/storage.ts`
- Frontend: `client/src/pages/admin.tsx` page, sidebar conditional link

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin/users` | Admin | List all users with roles |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |
| GET | `/api/admin/artists` | Admin | List all artists |
| DELETE | `/api/admin/artists/:id` | Admin | Hard delete artist + cascade |
| GET | `/api/admin/artworks` | Admin | List all artworks |
| DELETE | `/api/admin/artworks/:id` | Admin | Hard delete artwork + cascade |
| GET | `/api/admin/exhibitions` | Admin | List all exhibitions |
| DELETE | `/api/admin/exhibitions/:id` | Admin | Hard delete exhibition + cascade |

### Database Changes

- `users.role` — varchar, values: `user` | `curator` | `admin`, default `user`
- Migration sets `liviu.iusan@gmail.com` as admin

### Cascade Delete Order

**Artist:** exhibition_artworks (via artworks) → bids (via auctions) → auctions → orders → artworks → blog_posts → artist
**Artwork:** exhibition_artworks → bids (via auctions) → auctions → orders → artwork (already exists)
**Exhibition:** exhibition_artworks → exhibition

## Open Questions

None — all decisions confirmed.
