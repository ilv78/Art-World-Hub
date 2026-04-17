# SEO Feature Changelog

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
