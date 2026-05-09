# Social Share — Changelog

## 2026-05-04 — Branded OG card images (#577)

- New endpoint `GET /api/og/:type/:id.jpg` (type ∈ artwork|blog|exhibition|artist) renders a 1200×630 branded JPEG: source image as a blurred + lightly-darkened background, title (Playfair Display Bold) + subtitle (Inter Regular) on the upper-left, full-width brand-orange divider near the bottom, and the in-app brand mark (V diamond + `vernis9.art` wordmark) below it.
- New `server/lib/og-card.ts` (`composeOgCard`) — sharp + SVG composite. SVG `<text>` doesn't auto-wrap so titles are line-broken in code (max 2 lines, ellipsis on overflow). When no source image is available (artist with no avatar, artwork hosted on an external URL we won't fetch) the background uses a brand-orange radial-glow + faint diagonal accent — looks intentional rather than "image failed".
- New `server/routes/og-cards.ts` — resolves item by type+id via storage, on-disk cache at `uploads/og-cards/<type>-<id>.jpg`, freshness check by comparing cache mtime to source-image mtime (works without table-level `updatedAt`). 30-day `Cache-Control` + `X-OG-Cache: hit|miss` debug header. Sets `Cross-Origin-Resource-Policy: cross-origin` (override of helmet's `same-origin` default — that header otherwise blocks Facebook / X / LinkedIn / Telegram from embedding the image cross-origin). Falls back to `/og-default.png` on item-not-found, unknown type, or any composition error.
- `server/meta.ts`: `ogImage` on the four item branches (artwork, blog, exhibition, artist; plus the `?artwork=<slug>` short-circuit) now points at `/api/og/<type>/<id>.jpg?v=<8charHash>`. Hash is computed from title|subtitle|sourceImageUrl so any displayed-field change busts external caches. **Static routes (`/`, `/store`, `/gallery`, etc.) are intentionally untouched — only items shared via the in-app share button get the branded card.**
- Brand fonts bundled in `assets/fonts/` (Playfair Display Bold + Inter Regular, SIL OFL). Dockerfile installs `fontconfig`, copies fonts to `/usr/share/fonts/truetype/vernis9/`, runs `fc-cache`. Local dev uses whatever the host has — generic `serif` / `sans-serif` fallback in the SVG keeps cards legible without the bundled fonts.
- `client/index.html`: added `og:image:width` / `og:image:height` (constants 1200/630 — both branded card and `og-default.png` are that size) + `og:image:alt` / `twitter:image:alt`. FB / Telegram skip images on cold scrapes when dimensions are missing.
- `escapeHtml` in `server/meta.ts` now collapses whitespace (`\s+` → ` `) before HTML-escaping. Source values like artist bios contain literal newlines — left as-is they break HTML attribute parsing in stricter consumers (Facebook bails on a meta tag whose `content="..."` value spans multiple physical lines and never reaches `og:image`). Pre-existing bug surfaced during this work.
- Copy link share button (`share-buttons.tsx`) now UTM-tags the copied URL via `withUtm(url, "copy", itemType)` like the platform buttons do — gives analytics a "copy" channel AND varies the URL string per share, which bypasses per-URL preview caches in apps like Telegram that otherwise lock onto a single stale preview for a bare URL.
- New deploy subdir `uploads/og-cards/` added to Dockerfile + CI/deploy mkdir chains.
- Tests cover dimensions (1200×630 JPEG), cache-hit vs cache-miss, fallback paths (item not found, unknown type, unreadable source), and source-less rendering (artist with no avatar).

**Known limitations (potential Phase 2):**
- One universal layout for all four item types — per-type custom layouts (artwork frame, blog text-heavy, exhibition collage, artist portrait) deferred.
- Cache-bust hash derives from displayed fields, not all DB columns — admin description-only edits won't bust external caches until the 30-day TTL expires.
- Static-route shares (`/`, `/store`, etc.) still serve `og-default.png` with helmet's default `Cross-Origin-Resource-Policy: same-origin` from express.static — those previews will not render on cross-origin embedders. Out of scope here; would be a one-line helmet config change in a follow-up.

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
