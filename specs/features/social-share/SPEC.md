# Feature: Social Share Buttons

**Status:** Initial implementation
**Last Updated:** 2026-05-03
**Owner:** Frontend + Backend
**Issue:** [#569](https://github.com/ilv78/Art-World-Hub/issues/569)

## Summary

Per-item share buttons on artwork, blog post, exhibition, and artist profile pages. Hybrid UX: on mobile (Web Share API available) a single "Share" button opens the OS share sheet; on desktop a row of per-platform buttons + Copy link. Every click is recorded server-side for our own analytics.

## Decisions

### Platform list (Phase 1 analysis)

| Platform | Desktop button | Mobile (OS sheet) | Why |
|---|---|---|---|
| Facebook | Yes | Yes (via OS sheet) | `sharer.php` — works |
| LinkedIn | Yes | Yes | `share-offsite` — works |
| Pinterest | Yes | Yes | `pin/create/button` — fits visual art |
| X (Twitter) | Yes | Yes | `intent/tweet` — works on twitter.com and x.com |
| Bluesky | Yes | Yes | `bsky.app/intent/compose` — works web + iOS |
| Instagram | **No** | Yes (via OS sheet only) | Instagram has no public web share intent — desktop button would be a dead-end. On mobile the OS share sheet routes to the IG app. |
| Copy link | Yes | (via OS sheet) | Always-works fallback |

### Public share counts (e.g. "shared 42 times on Facebook")

Dropped. Public count APIs were removed by Facebook (2018), LinkedIn (2017), and never existed for X/Bluesky/Instagram. Pinterest still has one but it's unreliable. Showing "0" or "—" on five of six platforms degrades the UI; we'd rather track our own counts.

### Self-tracked analytics

In scope. Every click on a share button POSTs to `/api/share-events` with `{itemType, itemId, platform, userAgentClass}`. Stored in `share_events` table for admin reporting. Rate-limited at **6 req/min/IP** because a normal user shares a handful of times in a session at most; anything higher is botting the analytics.

### UTM tagging

Outbound URLs are tagged with `?utm_source=<platform>&utm_medium=share&utm_campaign=<itemType>`. Incoming `utm_*` params on the page URL are stripped before re-tagging so a user re-sharing a link they arrived at via a previous share doesn't produce duplicate UTMs.

## Architecture

### Server

- **Schema** (`shared/schema.ts`): `share_events` table — `id`, `item_type`, `item_id`, `platform`, `user_id` (nullable — anonymous shares allowed), `user_agent_class`, `created_at`. Three indexes: `(item_type, item_id)`, `created_at`, `platform`.
- **Storage** (`server/storage.ts`):
  - `recordShareEvent(event)` — append-only insert
  - `getShareEventStats({ sinceDays })` — aggregates: totals by platform, top 20 items
- **Routes** (`server/routes.ts`):
  - `POST /api/share-events` — public, Zod-validated, 6/min/IP rate limit
  - `GET /api/admin/share-events/stats?days=N` — admin-only, defaults to 30 days, clamped 1–365
- **Meta tags** (`server/meta.ts`):
  - New `/curator-gallery/:id` branch — OG/Twitter tags + `ExhibitionEvent` JSON-LD with `VirtualLocation`
  - New `?artwork=<slug>` short-circuit — when any URL carries this query param, emit artwork-specific OG and set canonical/og:url to `/artworks/<slug>` so SEO + FB OG dedup treat the detail page as authoritative even when the shared URL is e.g. `/store?artwork=foo`
  - Refactored existing `/artworks/:slug` branch to share `buildArtworkMetaFrom()` with the query-param flow (eliminated ~50 lines of duplication)

### Client

- **Pure helpers** (`shared/share-urls.ts`): `withUtm`, `buildShareUrl`, `buildNativeShareData`. No DOM, no fetch — testable from server-side test suite.
- **Client wrapper** (`client/src/lib/share-urls.ts`): re-exports the pure helpers + adds `postShareEvent` (fires the analytics POST with `keepalive: true` so it survives navigation during a popup share).
- **Component** (`client/src/components/share-buttons.tsx`):
  - Feature-detects `navigator.share` *and* mobile UA class (we don't show the native button on desktop browsers that happen to expose `navigator.share`)
  - Inline brand SVGs for FB/LinkedIn/Pinterest/X/Bluesky (kept tiny, single-color)
  - Copy link uses `navigator.clipboard.writeText` + toast + inline checkmark feedback
- **Page integrations**: `artwork-detail` (also gained an `Add to Cart` button so the page action set matches the modal), `blog-post`, `curator-gallery` (non-immersive header only — doesn't intrude on 3D mode), `artist-profile`.
- **Modal integration** (`client/src/components/artwork-detail-dialog.tsx`): share buttons live under the Add-to-Cart action. The modal builds a per-context share URL of the form `<currentPath>?artwork=<slug>` (vs. the page's plain canonical URL) so recipients see the same modal-over-context UX as the sender.
- **Auto-open hook** (`client/src/hooks/use-modal-from-query.ts`): wired into the four parent pages that mount the dialog (store, gallery, artist profile, curator gallery). When the URL carries `?artwork=<slug>`, the hook waits for the artworks list to load, finds the matching artwork by slug, and opens the modal. Closing the modal strips the param via `history.replaceState` so a refresh doesn't reopen it. Tracks "last applied slug" with a ref so the close-cleanup doesn't race the open-effect on initial render.
- **Title-click hijack**: artwork titles in `<ArtworkCard>` (store/gallery/curator-gallery) and on artist portfolio cards now open the modal on click. The `<a href="/artworks/<slug>">` is kept for SEO crawlability (no JS); user clicks call `e.preventDefault()` and trigger `onViewDetails`.
- **Artist profile dialog mount**: moved the `<ArtworkDetailDialog>` from inside the portfolio `TabsContent` to the page root so it's rendered regardless of active tab. When `?artwork=<slug>` is present in the URL, the active tab also defaults to `portfolio` so the modal opens over a meaningful context.

### Admin

New "Shares" tab in `/admin` with two cards:
1. **Shares by platform** — totals over the last 30 days
2. **Top shared items** — top 20 items by share count

Currently shows `itemType` + `itemId` + count. Future iteration could resolve item names by joining against the source tables; deferred to keep the storage query simple.

## Out of scope (deferred)

- **Branded OG card images (logo + item visual + title)** — opened as [#577](https://github.com/ilv78/Art-World-Hub/issues/577). Today's `og:image` for each item is the raw asset (artwork, cover, hero, avatar); composing a branded preview is its own design discussion.
- **Auctions detail share** — no detail page exists; covered by [#509](https://github.com/ilv78/Art-World-Hub/issues/509).
- **Site-wide analytics tool (Plausible/PostHog/etc.)** — bigger decision (privacy banner, GDPR, tool choice); separate issue.
- **Item-name resolution in admin top-N view** — small future iteration.
- **Public "shared N times" display on item pages** — possible later; data is already there.

## Files touched

**New:**
- `shared/share-urls.ts` — pure URL builders + UTM helper
- `client/src/lib/share-urls.ts` — client wrapper with `postShareEvent` + `getCanonicalShareUrl`
- `client/src/components/share-buttons.tsx`
- `client/src/hooks/use-modal-from-query.ts` — auto-opens the artwork modal from `?artwork=<slug>`
- `migrations/0012_add_share_events.sql`
- `server/__tests__/share-urls.test.ts`
- `specs/features/social-share/SPEC.md`
- `specs/features/social-share/CHANGELOG.md`

**Modified:**
- `shared/schema.ts` — `share_events` table + indexes + Zod insert schema
- `server/storage.ts` — `recordShareEvent`, `getShareEventStats`
- `server/routes.ts` — `POST /api/share-events` (6/min/IP), `GET /api/admin/share-events/stats`
- `server/meta.ts` — `/curator-gallery/:id` branch + `?artwork=<slug>` short-circuit + extracted `buildArtworkMetaFrom`
- `client/src/components/artwork-detail-dialog.tsx` — share buttons under Add-to-Cart, parent-relative share URL
- `client/src/components/artwork-card.tsx` — title click opens modal (SEO link preserved)
- `client/src/pages/artwork-detail.tsx` — Add-to-Cart action + share buttons
- `client/src/pages/blog-post.tsx` — share buttons
- `client/src/pages/curator-gallery.tsx` — share buttons + auto-open modal hook
- `client/src/pages/artist-profile.tsx` — share buttons + auto-open hook + dialog hoisted out of portfolio TabsContent + portfolio tab default when `?artwork=` present + title click opens modal
- `client/src/pages/store.tsx` — auto-open modal hook
- `client/src/pages/gallery.tsx` — auto-open modal hook
- `client/src/pages/admin.tsx` — Shares tab with platform totals + top-shared items
- `server/__tests__/meta.test.ts` — `/curator-gallery/:id` cases + `?artwork=<slug>` short-circuit cases
- `server/__tests__/storage.test.ts` — `recordShareEvent` cases
- `server/__tests__/routes.test.ts` — `POST /api/share-events` + admin stats cases
- `server/__tests__/helpers/test-app.ts` — mock storage extended
- `server/__tests__/helpers/mock-storage.ts` — mock storage extended
- `specs/architecture/DATA-MODEL.md` — `share_events` row + migration row
- `specs/decisions/DECISION-LOG.md` — share-tracking decision row
