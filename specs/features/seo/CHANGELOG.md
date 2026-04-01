# SEO Feature Changelog

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
