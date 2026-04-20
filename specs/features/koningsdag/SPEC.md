# Koningsdag Landing Page

**Status:** Active
**Issue:** [#526](https://github.com/ilv78/Art-World-Hub/issues/526)
**Route:** `/koningsdag`
**Campaign date:** 27 April 2026

## Purpose

Single-screen landing page reached via a QR code at the Koningsdag flea market. One intent: capture an email address so a follow-up letter with the story behind Alexandra's reverse glass paintings can be sent. After submission, visitors are returned to the main site homepage.

## Behavior

1. Visitor scans QR → lands on `https://vernis9.art/koningsdag`.
2. Enters an email and clicks **Send me the story**.
3. Frontend validates with `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. If invalid → inline error: *"That doesn't look like an email."*
4. Valid → `POST /api/newsletter/subscribe` with `{ email, source: "koningsdag-2026" }`.
5. On 2xx → success panel renders (*Thank you. The story is on its way…*) and, after ~6 seconds, the page redirects to `/`. A manual "Back to vernis9.art" link is also shown.

## Visual design

Follows the handoff bundle in issue #526 (`welcome.page.-.koningsdag.vernis9.zip`):

- Paper theme `#F7F2EA` background, warm grain overlay.
- Two-column split on desktop (`1.05fr 1fr`); stacked on <900px (painting first).
- Editorial EN copy (only variant shipped).
- Playfair Display for headline + input text, Inter for body/button, Tenor Sans for uppercase labels — all already imported in `client/index.html`.
- Reuses `<Vernis9Logo>` — no chrome from the main app (no `TopNav`, `Footer`, or `BottomTabs`).
- Hero image served statically from `/campaigns/koningsdag/alexandra-painting.jpg`. **Do not** place campaign assets under `client/public/<route-name>/` — it triggers a 301 loop in production (#528): serve-static redirects `/route` → `/route/`, nginx strips the trailing slash and redirects back.

## Architecture

### Data
Reuses the existing `newsletter_subscribers` table (`shared/schema.ts`). Added one column:

| Column | Type | Notes |
|---|---|---|
| `source` | `varchar(50)`, default `'general'`, not null | Tags the capture origin. Whitelist: `general`, `koningsdag-2026`. |

Migration: `migrations/0009_faithful_sally_floyd.sql`.

### API
`POST /api/newsletter/subscribe` now accepts an optional `source` string. The route rejects any value outside the whitelist with 400. If omitted, defaults to `general` (existing behavior preserved for the footer signup). Re-subscribing a previously unsubscribed email updates its `source` to the new value.

### Frontend
- Page: `client/src/pages/koningsdag.tsx`.
- Route registration + layout opt-out: `client/src/App.tsx` (via a `BARE_ROUTES` set; the shell renders `<Router/>` without `<PublicLayout>` for bare routes).
- SEO: `<meta name="robots" content="noindex,nofollow" />` — the campaign URL is not meant for search indexing.

## Operational notes

- Admin can view subscribers (including `source`) via `GET /api/newsletter/subscribers`. The admin UI does not yet surface the column separately; follow-up work if filtering becomes useful.
- Out of scope for the initial PR: Resend confirmation email, Dutch translation toggle, Instagram link, date eyebrow tag. The underlying design tweak flags exist in the prototype if re-enabled later.
