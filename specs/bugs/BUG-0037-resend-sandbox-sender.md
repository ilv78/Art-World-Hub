# BUG-0037: Resend not sending emails except to owner

**Status:** Resolved
**Severity:** High
**Last Updated:** 2026-03-13
**Reporter:** ilv78

## Description

Magic link emails and order notification emails were only delivered to the Resend account owner's email address. All other recipients never received emails.

**Expected:** All users should receive magic link signup emails and order confirmations.

## Root Cause

The default sender address was `onboarding@resend.dev` — Resend's sandbox domain. Resend's sandbox restricts delivery to only the account owner's email. Any email sent to a non-owner address is silently dropped.

## Fix

Changed the default sender from `ArtVerse <onboarding@resend.dev>` to `ArtVerse <gallery@idata.ro>` (verified domain) in `server/email.ts`. Updated `.env.example` to reflect the correct sender.

- **PR:** #88
- **Files changed:** `server/email.ts`, `.env.example`

## Workaround

Previously required setting `RESEND_FROM_EMAIL` env var manually on each environment. No longer needed — the default is now correct.
