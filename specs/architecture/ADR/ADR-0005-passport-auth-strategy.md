# ADR-0005: Passport.js with OIDC + Local Auth Strategy

**Status:** Active
**Date:** 2026-03-12
**Owner:** Architecture

## Context

ArtVerse initially supported only Google OIDC login. Users without Google accounts could not access the platform. A second authentication method was needed while keeping the existing OIDC flow intact.

## Options Considered

1. **Passport.js with OIDC + local strategy** — Add email/password alongside existing Google login
   - Pros: Passport already in use, local strategy is simple, magic links ensure email ownership
   - Cons: Two auth flows to maintain, password storage responsibility
2. **Auth0/Clerk** — Managed authentication service
   - Pros: Handles everything, social logins built in
   - Cons: External dependency, cost, less control
3. **Custom JWT auth** — Roll own token-based auth
   - Pros: Full control, stateless
   - Cons: More complex, need to handle refresh tokens, session management

## Decision

Extend existing Passport.js setup with `passport-local` strategy for email/password login. Magic link signup via Resend ensures email ownership before password creation. Bcryptjs (12 salt rounds) for password hashing. Both auth methods share the same session infrastructure (PostgreSQL via connect-pg-simple).

## Consequences

- Positive: Users without Google accounts can now sign up; magic links verify email ownership; existing OIDC flow unchanged
- Negative: Password storage responsibility (mitigated by bcrypt); two auth flows to test
- Risks: Email deliverability depends on Resend service availability

## References

- `server/replit_integrations/auth/replitAuth.ts` — Both auth strategies
- `server/email.ts` — Magic link email sending
- `specs/features/email-login/SPEC.md` — Email login specification
- `specs/features/authentication/SPEC.md` — Authentication specification
