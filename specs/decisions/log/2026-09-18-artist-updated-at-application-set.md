---
date: 2026-09-18
title: Set `artists.updatedAt` explicitly in `storage.updateArtist`, not a Postgres trigger; leave the shipped `/og/artist/:slug.jpg` route name as-is rather than matching the issue's sketched `/og/artists/:slug.png`
issue: 538
category: Architecture
---

Issue #538 (Phase 3 of the artist-SEO ultraplan, #363) explicitly left the `updatedAt`
mechanism to the implementer: "`updateArtist` sets `updatedAt = new Date()` (or a Postgres
trigger; pick the cheaper option)." **Chosen: application-set**, matching the existing
`blog_posts`/`curator_galleries` columns (`storage.updateBlogPost`, `updateSiteSettings`,
etc. all do `.set({ ...data, updatedAt: new Date() })` — grep confirms no trigger exists
anywhere in this schema). A trigger would be the only DB-level trigger in the project,
adding a second mechanism to reason about and, on staging (`DB_MIGRATION_MODE=push`,
per `specs/AGENT-AUTONOMY-POLICY.md` §6), triggers created via raw SQL in a migration body
don't execute at all — Drizzle's `push` mode only diffs the schema file, not migration
SQL — so a trigger-based approach would silently not exist on staging. Application-set
avoids that trap entirely and keeps every `updatedAt` column in the codebase consistent.
Reversible: swap the two `.set()` calls in `server/storage.ts`'s `updateArtist` for a
trigger migration if a future column needs true DB-level enforcement (e.g. writes outside
`storage.ts`, which don't currently exist for `artists`).

Separately: the issue's acceptance criteria sketched the per-artist OG card at
`/og/artists/<slug>.png` (curl-testable, 1200×630). That work item was already shipped
before this issue, under #577/#593, as `GET /og/:type/:id.jpg` — singular `artist`, not
plural `artists`, and `.jpg` not `.png` — with existing callers (`server/meta.ts`'s
`ogCardUrl()`) and test coverage (`server/__tests__/og-card.test.ts`). Renaming the route
to match the issue's sketch would be a breaking change to a live, working endpoint for a
purely cosmetic path/extension difference with zero functional gain — the acceptance
criteria's intent (a branded 1200×630 card per artist, reachable by URL) is already met.
**Chosen: leave the route as shipped**, and document the discrepancy explicitly in
`specs/features/seo/SPEC.md` and `specs/features/seo/CHANGELOG.md` so a future reader
doesn't mistake the issue's sketch for the real contract. Reversible: renaming the route
is a small, mechanical change if ever desired, but nothing in this PR depends on it.
