# Admin Section Feature Spec

**Issue:** [#8](https://github.com/ilv78/Art-World-Hub/issues/8)
**Status:** Implemented
**Date:** 2026-03-14

## Overview

Admin dashboard for platform management — user role management, content moderation (artists, artworks, exhibitions, blog posts).

## Roles

| Role | Permissions |
|------|------------|
| `user` | Default. Standard platform access. |
| `curator` | Reserved for future use (exhibition curation). |
| `admin` | Full platform management via `/admin`. |

## Schema Change

```sql
ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'user' NOT NULL;
```

Migration: `migrations/0002_noisy_iron_monger.sql`

## API Endpoints

All admin endpoints require the `isAdmin` middleware (401 if not authenticated, 403 if not admin).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users (password hashes stripped) |
| PATCH | `/api/admin/users/:id/role` | Update user role |
| GET | `/api/admin/artists` | List all artists |
| DELETE | `/api/admin/artists/:id` | Delete artist (cascades: artworks, auctions, bids, orders, blog posts) |
| GET | `/api/admin/artworks` | List all artworks |
| DELETE | `/api/admin/artworks/:id` | Delete artwork (cascades: exhibition links, auctions, bids, orders; regenerates gallery) |
| GET | `/api/admin/exhibitions` | List all exhibitions |
| DELETE | `/api/admin/exhibitions/:id` | Delete exhibition (cascades: exhibition artwork links) |
| GET | `/api/admin/blog` | List all blog posts (including unpublished) |
| DELETE | `/api/admin/blog/:id` | Delete blog post |

## Frontend

- **Route:** `/admin` — renders `client/src/pages/admin.tsx`
- **Access control:** Page checks `user.role === "admin"` client-side; shows "Access Denied" otherwise
- **Sidebar:** Admin link with Shield icon, visible only to admin users
- **Layout:** Stats cards (users, artists, artworks, exhibitions, blog posts) + 5 tabbed sections
- **Delete actions:** All deletions require confirmation via AlertDialog
- **Cache invalidation:** Admin mutations invalidate both admin and public query caches

## Security

- `isAdmin` middleware queries the database for the user's role on every request — no role caching
- Admin cannot change their own role (prevents accidental self-demotion)
- Password hashes are stripped from all user responses
- Delete operations cascade properly to avoid orphaned records

## Files Modified

- `shared/models/auth.ts` — `role` column, `USER_ROLES`, `UserRole` type
- `server/replit_integrations/auth/replitAuth.ts` — `isAdmin` middleware
- `server/replit_integrations/auth/index.ts` — export `isAdmin`
- `server/storage.ts` — `getUsers`, `updateUserRole`, `deleteArtist`, `deleteExhibition`, `getAllBlogPosts`
- `server/routes.ts` — 10 admin endpoints
- `client/src/pages/admin.tsx` — admin dashboard page (new)
- `client/src/App.tsx` — `/admin` route
- `client/src/components/app-sidebar.tsx` — conditional admin link
- `server/__tests__/helpers/mock-storage.ts` — admin mocks
- `server/__tests__/helpers/test-app.ts` — admin mocks + `isAdmin` mock
