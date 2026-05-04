# Social Share — Changelog

## 2026-05-04 — Home page auto-open fix (#580)

- `client/src/pages/home.tsx` now wires `useArtworkModalFromQuery` so a `/?artwork=<slug>` URL (e.g. one shared from the home "Featured Artworks" modal) auto-opens the modal on the recipient's side. Previously only store / gallery / artist profile / curator gallery were wired — home was missed in the initial #569 implementation.

## 2026-05-03 — Initial implementation (#569)

- New `share_events` table + storage methods + `POST /api/share-events` (6/min/IP rate-limited) + admin stats endpoint
- Hybrid share component (Web Share API on mobile, per-platform button row on desktop) wired into the artwork-detail modal, the artwork-detail page, blog post, curator gallery (exhibition), and artist profile
- UTM tagging on outbound URLs (`utm_source=<platform>&utm_medium=share&utm_campaign=<itemType>`); incoming `utm_*` params are stripped before re-tagging
- Modal share URL: `<currentPath>?artwork=<slug>` (e.g. `/store?artwork=foo`) so recipients see the same modal-over-context UX as the sender. Parent pages (store, gallery, artist profile, curator gallery) auto-open the modal when this query param is present via the `useArtworkModalFromQuery` hook
- `server/meta.ts` extended with two paths: `/curator-gallery/:id` for shared exhibition URLs (ExhibitionEvent JSON-LD + VirtualLocation), and a `?artwork=<slug>` short-circuit that emits artwork-specific OG on any URL with that query param. Canonical / `og:url` always points at `/artworks/<slug>` regardless of which parent path the URL lives under
- Detail page (`/artworks/:slug`) gained an `Add to Cart` button so a recipient who lands there from a search result has the same primary action as a modal user
- Title clicks on artwork cards (store / gallery / curator-gallery / artist portfolio) now open the modal instead of navigating to the detail page; the `<a href>` is kept for SEO crawlers (no JS) while user clicks fire `e.preventDefault` and `setSelectedArtwork`
- Artist profile: `<ArtworkDetailDialog>` hoisted out of the portfolio `TabsContent` so it's always mounted; URLs with `?artwork=<slug>` default the active tab to `portfolio` so the modal opens over a meaningful context
- New "Shares" admin tab showing platform totals and top 20 shared items over the last 30 days
- Inline brand SVGs for FB/LinkedIn/Pinterest/X/Bluesky (no new dependency)
- Instagram desktop button intentionally omitted (no public web share intent); on mobile the OS share sheet routes to IG
- Branded OG card images (logo + item visual + title composition) deferred to [#577](https://github.com/ilv78/Art-World-Hub/issues/577)
