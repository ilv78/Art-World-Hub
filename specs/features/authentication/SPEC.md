# Feature: Authentication

**Status:** Active
**Last Updated:** 2026-09-23
**Owner:** Architecture

## Summary

Multi-provider authentication system supporting Google OIDC single sign-on and local email/password login. Sessions are stored in PostgreSQL via `connect-pg-simple`. On first login, a user record is created with `approvalStatus: "pending"`; an administrator must approve the account, at which point its artist profile is provisioned, before it can reach any resource-consuming endpoint (see [Account Approval](#account-approval-831) below).

## User Story

As a visitor, I want to sign in with my Google account or email/password, so that I can access my artist dashboard and manage my gallery.

## Acceptance Criteria

- [x] Google OIDC login via `/api/login/google` with callback handling
- [x] Email/password login via `POST /api/auth/login` (Passport local strategy)
- [x] Session persistence in PostgreSQL with 7-day TTL
- [x] New accounts start `approvalStatus: "pending"`; an administrator approves or rejects them before the artist profile is created and before any resource-consuming endpoint is reachable
- [x] Token refresh for OIDC sessions (checks `expires_at`, uses refresh token)
- [x] `isAuthenticated` middleware protects all mutation routes
- [x] Ownership authorization on write endpoints (artist can only modify their own resources)
- [x] MCP endpoint requires authentication
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
| GET | `/api/auth/user` | Session only | Fetch current authenticated user (excludes password) — deliberately reachable while `pending`/`rejected` so the client can render the right state |
| POST | `/api/auth/login` | No | Local strategy: validate email + bcrypt password |
| GET | `/api/artists/me` | Yes + approved | Get/create artist profile for logged-in user |
| PATCH | `/api/admin/users/:id/approval` | Admin | Approve or reject a user (`{ status: "approved" \| "rejected" }`); approving a `"user"`-role account provisions its artist profile |

### Session Management

- **Store:** PostgreSQL via `connect-pg-simple` (auto-creates `sessions` table)
- **TTL:** 7 days, `httpOnly`, `secure` in production, `sameSite: lax`
- **OIDC sessions:** Include `access_token`, `refresh_token`, `expires_at`
- **Email sessions:** Session TTL manages validity (no token refresh)

### Database Tables

- `users` — `id`, `email`, `password` (nullable, bcrypt hash), `emailVerified`, `role`, `approvalStatus` (`pending` | `approved` | `rejected`, default `approved` — see below), `firstName`, `lastName`, `profileImageUrl`, `createdAt`, `updatedAt`
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

### Endpoint Authorization (2026-03-13)

Beyond `isAuthenticated` (which verifies the user is logged in), write endpoints enforce **ownership authorization**:

1. The authenticated user's ID is matched to an artist profile via `getArtistByUserId()`
2. The target resource's `artistId` is compared to the authenticated artist's ID
3. Mismatches return `403 Forbidden`

This applies to:
- `POST/PATCH/DELETE /api/artworks` — artist can only manage their own artworks
- `POST/PATCH/DELETE /api/blog` — artist can only manage their own blog posts
- `PATCH /api/artists/:id` — artist can only update their own profile
- `POST /api/orders` — requires authentication
- `GET /api/orders`, `GET /api/artists/:id/orders` — scoped to own artist profile (prevents PII exposure)
- `POST/GET/DELETE /mcp` — requires authentication (added P0 fix, PR #84)

(P0 fixes — PRs #82, #83, #84)

### Account Approval (#831)

New self-serve accounts (magic-link email signup and first-time Google OIDC login) must be
signed off by an administrator before they may consume any resource — creating an artist
profile, uploading, publishing, ordering, or anything else behind `isAuthenticated`.

- **Column:** `users.approvalStatus` — `"pending" | "approved" | "rejected"`, `varchar NOT NULL
  DEFAULT 'approved'`. The `'approved'` column default exists only to grandfather every row
  that predates this column (migration `0017_add_user_approval_status.sql` is a plain
  `ADD COLUMN`, so those existing rows need no separate backfill). A genuinely new account is
  always inserted with `"pending"` explicitly, at the application layer
  (`authStorage.upsertUser`), which overrides that default. An update-path upsert (an existing
  user logging in again) never touches `approvalStatus` — it is excluded from the `set` clause
  so a login cannot silently reset it.
- **Enforcement:** `isAuthenticated`, `isAdmin` and `isCurator` (`server/replit_integrations/auth/replitAuth.ts`)
  all reject a non-`"approved"` account with `403 { code: "ACCOUNT_NOT_APPROVED", approvalStatus }`.
  `isSessionValid` is the session-check-only middleware factored out of the old `isAuthenticated`
  body; only `GET /api/auth/user` uses it directly, so a pending/rejected user can still read
  their own record and the client can show the right screen instead of a generic error.
- **Resource deferral:** the artist profile — the actual "resource" a new account causes to be
  created — is no longer provisioned at signup/login (`upsertUser` for OIDC, `verify-email` for
  magic link). It is created by `PATCH /api/admin/users/:id/approval` when an admin approves a
  `"user"`-role account, matching the existing "curators/admins don't get one" rule. `GET
  /api/artists/me` still auto-creates on first dashboard visit as a fallback for any account
  that reaches `"approved"` without one, unchanged from before — it was already gated by
  `isAuthenticated`, which is what now blocks it for a pending account too.
- **Admin UI:** the Users tab in `/admin` shows an approval badge with Approve/Reject buttons
  next to the existing role selector.
- **Client UX:** `artist-dashboard.tsx` reads `user.approvalStatus` (from `/api/auth/user`) and
  shows a "pending"/"rejected" notice in place of the dashboard instead of letting the
  `/api/artists/me` 403 surface as a raw error.

## Open Questions

None — feature is stable and deployed.
