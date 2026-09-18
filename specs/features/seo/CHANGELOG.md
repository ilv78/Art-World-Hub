# SEO Feature Changelog

## 2026-09-18 — Explicit `width`/`height` on every `<img>` to prevent CLS (#507)
- #496's audit (§3.11) found most `<img>` tags omit `width`/`height`, so Lighthouse's "Image elements do not have explicit width and height" audit fails and the browser can't reserve layout space before an image loads.
- Every `<img>` and `<ResponsiveImage>` call site in `client/src` now sets `width`/`height`: matching the exact ratio of the container's Tailwind `aspect-*` class (or its fixed `w-N h-N` pixel size) where one exists, falling back to a `400×300` (4:3) default — per the issue's own suggested fallback — where no container aspect is declared.
- Neither `artworks`, `artists`, nor `blog_posts` store intrinsic image dimensions (`shared/schema.ts` has no `imageWidth`/`imageHeight` columns), so DB-backed images cannot use real values; the one static asset outside the DB (`client/public/campaigns/koningsdag/alexandra-painting.jpg`) got its real dimensions (`2304×2560`) read from the file instead.
- `ResponsiveImage` (`client/src/components/responsive-image.tsx`) needed no code change — it already spreads all `img` props, including `width`/`height`, onto the underlying `<img>`.
- Zero visual diff: every affected image already had `w-full`/`h-full`/`h-auto` or an explicit fixed size in its `className`, which overrides the attribute-derived box once CSS applies — the `width`/`height` attributes only affect the pre-load placeholder size.
- Lighthouse re-verification against the deployed instance is a manual post-merge step — CI has no browser-lab CLS check (see PR `## Verification`).

## 2026-09-17 — Semantic HTML pass: landmarks + heading hierarchy (#505)
- #496's audit claimed no `<main>`/`<nav>` existed anywhere — a curl-based check against the pre-hydration SPA shell, which really has neither; both already existed in the rendered DOM (`public-layout.tsx`'s `<main>` since #289, `top-nav.tsx`'s desktop `<nav>`) and are what Lighthouse/axe DevTools, the tools this issue's acceptance criteria name, actually see.
- What was real: `store.tsx`, `artists.tsx`, `auctions.tsx`, and `gallery.tsx`'s classic image viewer rendered their first sub-heading as `<h3>` directly under the page `<h1>`, skipping `<h2>` — a genuine axe `heading-order` violation.
- Fixed with a visually-hidden (`sr-only`) `<h2>` ahead of each results grid/tabs block, wrapped in a labelled `<section>` (matching `exhibitions.tsx`'s existing pattern), rather than promoting the shared `ArtworkCard`/`AuctionCard` components' `<h3>` — that would have flattened the already-correct `h2`→`h3` nesting those components have on `home.tsx`/`exhibitions.tsx`.
- Promoted four standalone empty/not-found states from `<h2>` to `<h1>` since each is the only heading on the page in that state: `gallery.tsx` ("Gallery Coming Soon"), `blog-post.tsx` ("Post not found"), `artwork-detail.tsx` ("Artwork not found").
- `top-nav.tsx`: added `aria-label` to the desktop `<nav>`; the mobile menu's wrapping `<div>` became a second, labelled `<nav>` (only one visible per breakpoint).
- `artist-profile.tsx`: bio card and the gallery/portfolio/blog tabs area wrapped in labelled `<section>`s, with a hidden `<h2>` ahead of the tabs.
- Zero visual diff — `sr-only` is the same clip-and-hide Tailwind utility already used in `top-nav.tsx`'s search dialog title.
- Lighthouse/axe DevTools re-verification against the deployed instance is a manual post-merge step — CI has no browser-lab accessibility check (see PR `## Verification`).

## 2026-09-17 — Reduce Cumulative Layout Shift on `/artists/:slug` (#553)
- Lighthouse 12 mobile runs against staging (post-#550) showed CLS bouncing 0 → ~0.21 across repeated runs on the artist profile page — into the "poor" band (Google's "good" threshold is < 0.1).
- Root cause: three independent loading states (`artistLoading`, and per-tab `galleryLoading`/`artworksLoading`/`blogLoading`) each swapped a structurally different, differently-sized `<Skeleton>` placeholder for the real content once its query resolved.
- `client/src/pages/artist-profile.tsx`: the whole-page loading skeleton now reuses the loaded layout's own banner + `max-w-5xl`/`-mt-24` card geometry instead of a generic `p-6` stack; the Gallery tab's skeleton is now a responsive grid of card-shaped placeholders (matching `ArtworkCard`'s `aspect-4/5` image) instead of one fixed `h-[500px]` block; the Blog tab's skeleton now matches the real card's `aspect-3/1` cover image + header shape instead of flat `h-40` bars.
- The avatar image (a candidate raised in the issue) was ruled out — its parent `<Avatar>` already renders at a fixed `w-32 h-32` regardless of image-load state, so there's no box to reflow.
- Lighthouse re-verification against the deployed instance is a manual post-merge follow-up (see PR `## Verification`) — CI has no browser-lab CLS check.

## 2026-09-17 — Real HTTP 404s for unknown SPA routes, not soft-404s (#508)
- `server/static.ts`'s SPA catch-all (and `server/vite.ts`'s dev-mode equivalent) served `index.html` with a `200` for every URL, including ones matching no page — Google treats "200 + not-found content" as a soft-404 and downranks the whole site's crawl quality.
- `server/meta.ts`'s `resolveMetaTags()` already resolves every URL against static routes, a new `KNOWN_NON_SEO_ROUTES` set (app pages with no custom SEO meta — `/dashboard`, `/curator`, `/admin`, `/auth`, `/auth/set-password`, `/koningsdag` — mirroring `client/src/App.tsx`), and the DB for dynamic routes (`/artists/:slug`, `/artworks/:slug`, `/blog/:id`, `/curator-gallery/:id`). It now also returns `notFound: boolean` from that same resolution, so no separate route registry was needed.
- A dynamic-route DB error fails open (`notFound: false`) rather than 404ing a page whose existence just couldn't be checked — only a completed lookup that finds nothing is a real 404.
- Extracted `createSpaCatchAllHandler()` in `server/static.ts` so the catch-all's status-code logic is unit-testable with supertest against a bare `express()` app, independent of a built `dist/public`.
- New tests: `server/__tests__/spa-404.test.ts` (end-to-end status codes via supertest) and additions to `server/__tests__/meta.test.ts` covering the `notFound` flag across static, known-non-SEO, dynamic-found, dynamic-missing, and DB-error cases.

## 2026-09-15 — Fix stored XSS via unescaped JSON-LD in SSR HTML (#683)
- `JSON.stringify` does not escape `<`, `>` or `&`. The JSON-LD `<script>` block built from it embeds attacker-controllable DB fields (artist name/bio, artwork title, gallery name, blog title) unescaped — a bio of `</script><script>...` closed the tag early and executed for every visitor of that artist/artwork/blog page. Every other meta-tag replacement already went through `escapeHtml()`; JSON-LD was the one gap.
- Added `escapeJsonForScript()` in `server/meta.ts`, applied to the `JSON.stringify(ld)` output before embedding: unicode-escapes `<` `>` `&` plus the ` `/` ` line separators (valid JSON, invalid raw script-context text). Representational only — a JSON parser reads the escaped payload back to the identical object.
- Regression tests in `server/__tests__/meta.test.ts` cover a literal `</script><script>` breakout payload and bare `&`/`>` characters.

## 2026-04-23 — Artist slug URLs `/artists/:slug` with UUID→slug + retired-slug 301 (#537)
- Added `slug` column to `artists` with unique index (migration `0010_nappy_psynapse.sql`, three-step pattern mirroring `0008` for artworks). Backfilled for existing rows; generated server-side on insert + regenerated on rename via `shared/artist-slug.ts`.
- New `artist_slug_history` table (migration `0011_real_loki.sql`) keyed on the retired slug with `ON DELETE CASCADE` back to `artists`. On `updateArtist` rename, the old slug is inserted into history in the same transaction — old URLs 301-redirect to the current slug forever (no-op when the rename yields the same slug).
- Client route `/artists/:id` → `/artists/:slug`. All in-app `<Link>` hrefs (artists list, home, blog post, artwork detail, maze gallery) updated to emit slug URLs.
- New public API `GET /api/public/artists/:slug` returning `{ artist }`. The artist profile page resolves the slug once and then re-uses the existing id-keyed sub-queries for artworks / gallery / blog — keeps React Query cache granularity and minimises changes.
- **Canonical 301 handler** in `registerRoutes()` before the SPA catch-all: UUID-shaped paths resolve to current slug; slug-shaped misses check the history table for a retired-slug 301; current-slug hits fall through so the SPA renders normally. Unknown params fall through to the SPA's 404 handling.
- `Person.url`, `Person.sameAs`-adjacent `ogUrl`, VisualArtwork `creator.url`, and VisualArtwork breadcrumb all now reference `/artists/:slug`. Sitemap artist entries emit slug URLs.
- Tests: `server/__tests__/artist-slug.test.ts` (helper), storage tests for slug derivation + rename retirement into history + no-op when slug unchanged, routes tests for the public endpoint + UUID-301 + retired-slug-301, meta tests for the canonical slug URL, sitemap test asserting slug emission.

## 2026-04-22 — `sameAs` on artist Person JSON-LD (#535)
- Person JSON-LD on `/artists/:id` now emits a `sameAs` array built from `artists.socialLinks` (JSONB). Primary driver for Google's Knowledge Graph / "same identity across the web" matching — the main off-platform ranking signal for personal-name queries.
- Filter: only values that match `^https?://` are included. Empty strings, bare handles, and relative paths are dropped so we never publish broken cross-links into structured data.
- Absent when `socialLinks` is null / empty / has no absolute-URL entries — no empty `sameAs: []` emitted.
- New helper `extractSameAs()` in `server/meta.ts`; tests in `server/__tests__/meta.test.ts` cover the three shapes (populated, empty, mixed-garbage filtered).
- Shipped alongside a one-off data fix for Alexandra Constantin's artist row (trailing-space `"Alexandra C. "` → `"Alexandra Constantin"`) so the literal name appears on the page — without the DB value, no code change ranks the page for the search query. See Phase 1 PR description for the SQL to run on staging + production.

## 2026-04-20 — Image sitemap namespace on `/sitemap.xml` (#504)
- `<urlset>` now declares `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`.
- Each published artwork URL carries `<image:image>` with `<image:loc>`, `<image:title>` (≤100 chars), and `<image:caption>` (≤500 chars, truncated with an ellipsis).
- Artist URL carries `<image:image>` when `avatarUrl` is set; blog URL carries `<image:image>` when `coverImageUrl` is set. A URL without its optional image is omitted cleanly (no empty `<image:image>` block).
- New `xmlEscape()` + `absolutize()` helpers for user-supplied strings and site-relative image paths — required now that titles/descriptions are injected into the sitemap.
- Cache (1h) preserved. New `server/__tests__/sitemap.test.ts` covers namespace, per-URL image blocks, XML escaping, caption truncation, cache reuse, and the published-only gate.

## 2026-04-17 — Public artwork detail pages with VisualArtwork JSON-LD (#503)
- New public route `GET /artworks/:slug` with server-rendered meta tags + `VisualArtwork` JSON-LD (creator Person, artMedium, dateCreated, genre). `offers` with EUR currency + `InStock` emitted when `isForSale && price > 0`.
- New `slug` column on `artworks` with unique index (migration `0008_superb_silver_centurion.sql`). Backfilled for existing rows; generated server-side on new artworks via `shared/artwork-slug.ts`.
- Privacy gate: only `isPublished = true` artworks resolve; drafts return 404.
- Sitemap now includes one `<url>` per published artwork (priority 0.6, monthly).
- Reciprocal links: artwork cards and artist-profile artwork grids now have real `<a href>` anchors on titles so crawlers can follow. Existing quick-view dialog UX preserved.
- New API endpoint `GET /api/public/artworks/:slug` returning `{ artwork, related }` (related = up to 6 other published works by the same artist).
- Tests: new `server/__tests__/artwork-slug.test.ts` + extended `meta.test.ts` coverage.

## 2026-04-17 — WebSite + FAQPage JSON-LD on homepage (#501)
- Added `WebSite` schema with `potentialAction: SearchAction` targeting `/store?search={search_term_string}` — enables Google sitelinks search box (param name matches the actual store page's query param)
- Added `FAQPage` schema with 5 hard-coded Q&A entries (what Vernis9 is, who can sell, no commission, how to buy, shipping)
- Added a visible FAQ accordion section on the homepage (before the CTA) rendering the same Q&A content — required by Google's FAQPage rich-result guidelines ("content must be visible to the user")
- FAQ copy lives in `shared/faqs.ts` so server JSON-LD and client FAQ section share a single source of truth
- Injected only on the `/` route; unit coverage added in `server/__tests__/meta.test.ts`

## 2026-04-01 — Alt Text Audit (#369)
- Added `alt` to 11 AvatarImage components across 7 files (blog, artists, artist-profile, artist-dashboard, artwork-detail-dialog, maze-gallery-3d, top-nav)
- All 30 `<img>` tags already had alt attributes — no changes needed
- Avatar alt text uses person's name (e.g., `alt={artist.name}`)

## 2026-04-01 — Image Lazy Loading (#368)
- Added `loading="lazy"` to 29 of 30 `<img>` tags across 16 files
- Hero carousel images on homepage kept eager (no lazy) for LCP optimization
- Covers: artwork cards, detail dialogs, store grid, blog covers, artist avatars, exhibitions, auctions, gallery views, dashboard images, cart thumbnails, 3D gallery overlays

## 2026-04-01 — Allow Rich Results Test on staging (#379)
- Changed non-production robots.txt from `Disallow: /` to permissive rules (same as production but without Sitemap)
- `Disallow: /` was blocking Google Rich Results Test from fetching pages
- Indexing prevention still enforced by `noindex` meta tag + `X-Robots-Tag` header (don't block fetching, only indexing)

## 2026-04-01 — Add SITE_URL to docker-compose files (#378)
- `SITE_URL` was missing from all three docker-compose deploy files
- Without it, code defaulted to `https://vernis9.art` and staging/preview would not block crawlers
- Added: staging=`https://staging.vernis9.art`, preview=`https://preview.vernis9.art`, production=`https://vernis9.art`

## 2026-04-01 — Block Crawlers on Non-Production (#376, #377)
- Converted static `robots.txt` to dynamic Express route (`server/routes/robots.ts`)
- Production: permissive robots.txt (Allow /, Disallow private routes, Sitemap link)
- Non-production: `<meta name="robots" content="noindex, nofollow">` + `X-Robots-Tag` HTTP header
- All keyed off `SITE_URL` env var at runtime (same Docker image, different behavior)

## 2026-04-01 — Fix express.static serving raw index.html (#375)
- `express.static` was serving `index.html` directly for `/` requests, bypassing meta injection
- This caused `__JSON_LD__` placeholder to render as visible text
- Fix: set `index: false` on `express.static` so all HTML requests go through the catch-all

## 2026-04-01 — Structured Data / JSON-LD (#367)
- Extended `server/meta.ts` to generate JSON-LD structured data per route
- Homepage: Organization schema (name, url, logo, description)
- Artist pages: Person schema (name, image, description, jobTitle, knowsAbout)
- Blog posts: BlogPosting schema (headline, image, datePublished, author, publisher)
- All pages: BreadcrumbList schema for navigation path
- Added `__JSON_LD__` placeholder to `client/index.html`
- JSON-LD injected server-side in raw HTML (not by JavaScript)

## 2026-04-01 — Server-Side Meta Tags + react-helmet-async (#366)
- Added placeholder tokens to `client/index.html` for server-side meta injection
- Created `server/meta.ts` — route-specific meta tag resolution (static routes + dynamic `/artists/:id`, `/blog/:id`)
- Updated `server/static.ts` to inject meta tags into cached HTML template (production)
- Updated `server/vite.ts` to inject meta tags in dev mode
- Installed `react-helmet-async`, added `HelmetProvider` to App, `<Helmet>` to all public pages
- Created branded default OG image at `client/public/og-default.png` (1200x630)
- Added `SITE_URL` env var to `.env.example`
- Meta tags: `<title>`, `description`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, canonical `<link>`

## 2026-03-31 — Initial Spec
- Created SEO spec with 6 work items after full audit
- Current state: SPA with no SEO infrastructure beyond basic static meta tags
