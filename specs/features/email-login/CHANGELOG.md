# Email Login — Changelog

## 2026-03-12
- Fixed magic link emails not sent in Docker (PR #38, closes #34)
- Added `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to staging/production docker-compose files

## 2026-03-11
- Initial implementation (PR #33, closes #6)
- Magic link signup with Resend email delivery
- Password-based signin with Passport local strategy + bcryptjs
- Schema migration: `magic_links` table, `password` + `emailVerified` columns on `users`
- Auth page at `/auth` with login/signup tabs
- Set password page at `/auth/set-password`
- Fixed React hooks order in auth page for rules-of-hooks lint
