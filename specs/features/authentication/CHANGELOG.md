# Authentication — Changelog

## 2026-03-12
- Added email/password login alongside Google OIDC (PR #33)
- Moved Google OAuth from `/api/login` to `/api/login/google`
- Added `GET /api/auth/config` endpoint for frontend capability detection
- Added `GET /api/login` redirect to `/auth` page

## 2026-03-11
- Fixed Google OAuth login across all environments (PR #13, #15, closes #11)
- Added dynamic OIDC host validation via `OIDC_ALLOWED_HOSTS`
- Fixed per-hostname strategy registration

## 2026-02 (Initial)
- Integrated Google OIDC authentication via Passport.js + openid-client
- Auto-creation of user + artist profile on first login
- Session storage in PostgreSQL via connect-pg-simple (7-day TTL)
- `isAuthenticated` middleware for protected routes
