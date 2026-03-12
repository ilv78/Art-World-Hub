# ADR-0006: Resend for Transactional Email

**Status:** Active
**Date:** 2026-03-12
**Owner:** Architecture

## Context

ArtVerse needs transactional email for magic link signup verification and order notifications (buyer confirmations, artist alerts). The previous email integration (Replit connector) was non-functional. A reliable, simple email service was needed.

## Options Considered

1. **Resend** — Modern email API
   - Pros: Simple API, good free tier (100 emails/day), handles deliverability, good DX
   - Cons: Newer service, free tier limits
2. **SendGrid** — Established email service
   - Pros: Battle-tested, large scale
   - Cons: More complex setup, heavier SDK
3. **AWS SES** — Amazon email service
   - Pros: Very cheap at scale, AWS ecosystem
   - Cons: Complex setup, domain verification, AWS dependency
4. **Nodemailer + SMTP** — Direct SMTP sending
   - Pros: No vendor dependency
   - Cons: Deliverability issues, need SMTP server, spam filtering challenges

## Decision

Resend v4.8.0 with API key authentication. Used for magic link verification emails and order notification emails. Graceful fallback when API key not configured (logs warning, no crash). Sender address configurable via `RESEND_FROM_EMAIL` env var.

## Consequences

- Positive: Simple integration (single API call), good deliverability, free tier sufficient for current scale
- Negative: Vendor dependency for email delivery
- Risks: Free tier limit (100/day) may need upgrade if user signups grow

## References

- `server/email.ts` — Resend integration
- `server/routes.ts` — Order notification emails
- `specs/features/email-login/SPEC.md` — Magic link email flow
