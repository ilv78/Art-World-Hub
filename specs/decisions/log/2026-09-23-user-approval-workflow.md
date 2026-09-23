---
date: 2026-09-23
title: New accounts require admin sign-off before consuming resources; grandfather existing users via column default, not a backfill
issue: 831
category: Security
---

#831 asked for an approval mechanism: a new user (created with just an email) can exist,
but an administrator must sign off before the account becomes usable — ideally before it
consumes any resource. The issue text set the requirement; everything below is what filled
in where it was silent, taken as the most reversible option per policy §2.

## What was chosen

**A `users.approvalStatus` column (`"pending" | "approved" | "rejected"`), `NOT NULL DEFAULT
'approved'`, enforced in the three role-checking middlewares.**

- **Grandfathering via column default, not a backfill `UPDATE`.** The migration
  (`migrations/0017_add_user_approval_status.sql`) is a single `ADD COLUMN ... DEFAULT
  'approved' NOT NULL` — Postgres populates every existing row from the default at
  add-time, in the same statement. A separate `UPDATE users SET approval_status =
  'approved'` would have been a data backfill, gated list item 1
  (`specs/AGENT-AUTONOMY-POLICY.md` §1), and staging runs Drizzle in `push` mode and does
  not execute migration SQL bodies (§6), so a backfill would also have left staging
  inconsistent with production. The column-default form needs neither a human approval nor
  a staging-specific workaround, and was verified directly: `drizzle-kit migrate` against a
  fresh Postgres 16 container applied cleanly, and `\d users` confirmed the default.
- **New accounts default to `"pending"` at the application layer, not the schema layer.**
  `authStorage.upsertUser` (`server/replit_integrations/auth/storage.ts`) inserts
  `approvalStatus: "pending"` explicitly, overriding the column's `"approved"` default,
  whenever the row does not already carry an explicit value. The column default stays
  `"approved"` rather than `"pending"` specifically so the one migration statement doubles
  as the grandfather clause — flipping the column default to `"pending"` would have
  required either two migrations (add-as-approved, then alter-default-to-pending) or would
  have made every future direct DB insert default to unusable, which is a worse failure
  mode than the reverse.
- **The update path of the same upsert never touches `approvalStatus`.** It is excluded
  from the `set` clause of `onConflictDoUpdate`, so a returning user's login can never
  silently reset an admin's decision.
- **The artist profile — the actual resource a new account causes to be created — is
  deferred to approval time**, not created at signup/login. `upsertUser` (OIDC) and the
  magic-link `verify-email` handler no longer call `ensureArtistProfile`; the new `PATCH
  /api/admin/users/:id/approval` endpoint does, only for `"user"`-role accounts (matching
  the pre-existing "curators/admins don't get one" rule), only on `"approved"`. This is
  what the issue's "before any resources are consumed" line asks for directly: approval is
  no longer just an access gate on an already-provisioned account, it is the point of
  provisioning.
- **Enforcement lives in `isAuthenticated`, `isAdmin`, and `isCurator`**
  (`server/replit_integrations/auth/replitAuth.ts`), all of which already loaded the DB
  user record for role checks — adding the approval check cost one extra field read, not an
  extra query. All three reject non-`"approved"` accounts with `403 { code:
  "ACCOUNT_NOT_APPROVED", approvalStatus }`. This covers uploads, artwork/order/blog
  mutations, curator galleries, and every admin endpoint in one place, rather than adding
  the check to each of the ~30 routes individually.
- **`GET /api/auth/user` is the one exception**, deliberately: a pending or rejected user
  still needs to read their own record so the client can render the right screen instead of
  a bare 401/403. The session-validity logic that used to be `isAuthenticated`'s whole body
  was factored out into `isSessionValid` (no approval check) and `isAuthenticated` now
  wraps it with the approval check. `isSessionValid` is exported for this one call site;
  every other route keeps using `isAuthenticated`.

## What was verified, not just typed

Ran the full flow against a real Postgres 16 container (not just the mocked test suite):
seeded a pending user, confirmed `GET /api/artists/me` 403s with
`ACCOUNT_NOT_APPROVED`/`pending` while `GET /api/auth/user` still 200s; logged in as an
admin, called `PATCH /api/admin/users/:id/approval` with `{"status":"approved"}`, confirmed
the artist profile was provisioned and `/api/artists/me` then 200s; repeated for
`"rejected"` and confirmed the account stays blocked. `npm run check`, `npm run lint`, and
`npm test` (429 tests, including new coverage in `auth-storage.test.ts` and
`auth-approval-middleware.test.ts`) all pass, and `npm run build` succeeds.

## What was rejected

**Blocking `GET /api/auth/user` too** (i.e. making `isAuthenticated` uniformly the only
gate) — rejected because the client would then be unable to distinguish "not logged in"
from "pending approval," and would have no data to render a pending/rejected screen at all.

**A dedicated `pending_users` staging table**, provisioning the real `users` row only on
approval — rejected as the less reversible option: it would need a second table, a second
migration, and a promotion step, for the same outcome the column achieves in one additive
change. The column can be dropped in a single reversible migration if this entire mechanism
is reversed; a second table plus promotion logic would be two things to unwind.

**Gating Google OIDC logins differently from magic-link signups** (e.g. auto-approving
OIDC since Google already verifies the email) — rejected because the issue says "when a new
user is created," not "when a new user signs up with just an email and no third-party
verification." Treating the two paths differently would be an undeclared narrowing of the
issue's scope, not a deviation stated outright per policy §1a.

## To reverse

Drop the `approvalStatus` column (single migration), remove the three `rejectUnapproved`
call sites in `replitAuth.ts`, restore the `ensureArtistProfile` calls removed from
`upsertUser`/`verify-email`, and delete `PATCH /api/admin/users/:id/approval`. No data
migration is needed either direction since the column default handles both.
