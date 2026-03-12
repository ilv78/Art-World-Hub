# Feature: Authentication

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

Multi-provider authentication system supporting Google OIDC single sign-on and local email/password login. Sessions are stored in PostgreSQL via `connect-pg-simple`. On first login, a user record and artist profile are auto-created.

## User Story

As a visitor, I want to sign in with my Google account or email/password, so that I can access my artist dashboard and manage my gallery.

## Acceptance Criteria

- [x] Google OIDC login via `/api/login/google` with callback handling
- [x] Email/password login via `POST /api/auth/login` (Passport local strategy)
- [x] Session persistence in PostgreSQL with 7-day TTL
- [x] Auto-creation of artist profile on first login
- [x] Token refresh for OIDC sessions (checks `expires_at`, uses refresh token)
- [x] `isAuthenticated` middleware protects all mutation routes
- [x] `GET /api/auth/config` exposes available auth methods to frontend
- [x] Auth page at `/auth` with login/signup tabs

## Technical Design

### Architecture

Authentication lives in `server/replit_integrations/auth/` with four files:
- `replitAuth.ts` — Core OIDC strategy setup, Google OAuth flow, local strategy, magic link routes
- `storage.ts` — `AuthStorage` class for user CRUD (upsert, find by email/ID)
- `routes.ts` — Auth endpoints (`/api/auth/user`)
- `index.ts` — Export barrel

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auth/config` | No | Expose `{ googleEnabled }` to frontend |
| GET | `/api/login/google` | No | Initiate Google OAuth flow |
| GET | `/api/callback` | No | OAuth callback, redirect to `/` or `/auth?error=...` |
| GET | `/api/logout` | No | Destroy session, redirect to `/` |
| GET | `/api/auth/user` | Yes | Fetch current authenticated user (excludes password) |
| POST | `/api/auth/login` | No | Local strategy: validate email + bcrypt password |
| GET | `/api/artists/me` | Yes | Get/create artist profile for logged-in user |

### Session Management

- **Store:** PostgreSQL via `connect-pg-simple` (auto-creates `sessions` table)
- **TTL:** 7 days, `httpOnly`, `secure` in production, `sameSite: lax`
- **OIDC sessions:** Include `access_token`, `refresh_token`, `expires_at`
- **Email sessions:** Session TTL manages validity (no token refresh)

### Database Tables

- `users` — `id`, `email`, `password` (nullable, bcrypt hash), `emailVerified`, `firstName`, `lastName`, `profileImageUrl`, `createdAt`, `updatedAt`
- `sessions` — `sid` (PK), `sess` (JSONB), `expire` (indexed)

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SESSION_SECRET` | Yes | Express session signing key |
| `OIDC_CLIENT_ID` | No | Google OAuth client ID (disables Google login if missing) |
| `OIDC_CLIENT_SECRET` | No | Google OAuth client secret |
| `OIDC_ISSUER_URL` | No | OIDC provider URL (default: `https://accounts.google.com`) |

## Dependencies

- `openid-client` v6.8.1 — OIDC/OAuth 2.0 client
- `passport` v0.7.0 — Authentication middleware
- `passport-local` v1.0.0 — Local strategy (email + password)
- `express-session` v1.19.0 — Session middleware
- `connect-pg-simple` v10.0.0 — PostgreSQL session store
- `bcryptjs` v3.0.3 — Password hashing (12 salt rounds)
- `memoizee` v0.4.17 — Cache OIDC config (3600s TTL)

## Open Questions

None — feature is stable and deployed.
