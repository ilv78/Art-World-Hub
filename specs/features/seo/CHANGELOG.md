# SEO Feature Changelog

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
