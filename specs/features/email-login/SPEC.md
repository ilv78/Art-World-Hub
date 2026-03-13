# Feature: Email Login

**Status:** Active
**Last Updated:** 2026-03-13
**Owner:** Architecture

## Summary

Magic link email signup and password-based signin, extending the authentication system beyond Google OIDC. New users receive a verification email via Resend, click a magic link to verify their address, then set a password. Returning users sign in with email + password.

## User Story

As a user without a Google account, I want to sign up with my email address and set a password, so that I can access ArtVerse without relying on third-party OAuth providers.

## Acceptance Criteria

- [x] Signup via `POST /api/auth/signup` sends a magic link email
- [x] Magic link token valid for 1 hour, single use
- [x] `GET /api/auth/verify-email?token=...` verifies email, auto-logs in, redirects to set-password
- [x] `POST /api/auth/set-password` hashes password with bcrypt (12 rounds), min 8 chars
- [x] `POST /api/auth/login` authenticates with email + password via Passport local strategy
- [x] Existing users with password cannot re-signup (must use login)
- [x] Graceful fallback when Resend API key is not configured (logs warning, no crash)
- [x] Auth page shows both Google and email login options when both are available

## Technical Design

### Magic Link Flow

1. User enters email on `/auth` signup tab
2. Server validates email (Zod), checks no existing password
3. Generates 32-byte random hex token, stores in `magic_links` table with 1-hour expiry
4. Sends HTML email via Resend with verification link
5. User clicks link → `GET /api/auth/verify-email?token=TOKEN`
6. Server validates token (exists, unused, not expired), marks `usedAt`, upserts user with `emailVerified: true`
7. Auto-logs in, redirects to `/auth/set-password` (if no password) or `/` (if password exists)
8. User sets password (min 8 chars) → bcrypt hash stored

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/signup` | No | Send magic link to email |
| GET | `/api/auth/verify-email` | No | Consume magic link token, auto-login |
| POST | `/api/auth/set-password` | Yes | Set password after email verification |
| POST | `/api/auth/login` | No | Email + password authentication |

### Database

- `magic_links` — `id`, `email`, `token` (unique), `expiresAt`, `usedAt` (nullable), `createdAt`
- `users` — Added `password` (varchar, nullable) and `emailVerified` (boolean, default false)
- Migration: `migrations/0001_illegal_famine.sql`

### Email Template

HTML email sent via Resend with:
- Header: "Welcome to ArtVerse"
- CTA button linking to `/api/auth/verify-email?token=...`
- Footer: "Link expires in 1 hour"
- Styled with serif font, primary orange (#F97316) accent

### Email Security

All user-supplied values interpolated into email HTML templates (order notifications, magic link emails) are passed through an `escapeHtml()` function that escapes `&`, `<`, `>`, `"`, and `'` characters. This prevents HTML injection attacks where a malicious buyer name or address could inject scripts or phishing content into notification emails. (P1 fix — 2026-03-13, PR #85)

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | No | Resend email service API key |
| `RESEND_FROM_EMAIL` | No | Sender address (default: "ArtVerse <onboarding@resend.dev>") |

## Dependencies

- `resend` v4.8.0 — Email delivery service
- `bcryptjs` v3.0.3 — Password hashing
- `passport-local` v1.0.0 — Local strategy
- Authentication feature (Google OIDC + session management)

## Open Questions

None — feature deployed to production 2026-03-12.
