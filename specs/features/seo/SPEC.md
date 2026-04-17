# Feature: SEO (Search Engine Optimization)

**Status:** In Progress
**Last Updated:** 2026-04-17
**Owner:** Architecture

## Summary

Prepare Vernis9 for search engine discovery and social sharing. The site is a client-side SPA served by Express — crawlers currently see identical HTML for every route. This spec adds the infrastructure needed for Google, Bing, and social platforms to properly index and display each page.

## Current State (Audit)

| Area | Status | Notes |
|------|--------|-------|
| `robots.txt` | Done | #364, #376 — dynamic route at `/robots.txt` (blocks indexing on non-production) |
| `sitemap.xml` | Done | #365 — dynamic endpoint at `/sitemap.xml` |
| Per-page meta tags | Done | #366 — server-side injection + react-helmet-async |
| Structured data (JSON-LD) | Done | #367 — Organization, Person, BlogPosting, BreadcrumbList; #501 — WebSite+SearchAction, FAQPage (homepage) |
| Twitter cards | Done | #366 — `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| Canonical URLs | Done | #366 — `<link rel="canonical">` on every page |
| www → non-www redirect | Done | #385 — nginx 301 redirect `www.vernis9.art` → `vernis9.art` |
| Trailing-slash canonicalization | Done | #427 — homepage canonical fixed; nginx strips trailing slash from non-root paths |
| Image lazy loading | Done | #368 — `loading="lazy"` on all below-the-fold images |
| OG image | Done | #366 — default `og-default.png` + per-entity images |
| Semantic HTML | Good | Proper heading hierarchy, `<section>`, `<article>`, `<main>` |
| URL structure | Good | Clean paths: `/artists/:id`, `/blog/:id` |
| Alt text | Done | #369 — all img and AvatarImage have descriptive alt text |

## Work Items

### 1. robots.txt

**What it does:** A file at the root of the website that tells search engine crawlers (Google, Bing, etc.) which pages they are allowed or not allowed to visit. Without it, crawlers attempt to index everything — including private pages like the admin panel and login page, which wastes their "crawl budget" and clutters search results.

**Priority:** P0
**Effort:** Small

**Implementation:**
- Dynamic Express route at `server/routes/robots.ts` (replaces static file)
- Production (`SITE_URL=https://vernis9.art`): permissive robots.txt with `Allow: /`
- Non-production (staging, preview): restrictive `Disallow: /` to block all crawlers
- Non-production also gets `<meta name="robots" content="noindex, nofollow">` and `X-Robots-Tag` HTTP header

**Acceptance criteria:**
- [x] `GET https://vernis9.art/robots.txt` returns valid robots.txt
- [x] Private routes are disallowed
- [x] Sitemap URL is declared
- [x] Non-production environments block all crawlers (robots.txt, meta tag, HTTP header)

---

### 2. Dynamic Sitemap

**What it does:** An XML file that lists every public page on the site, along with when it was last updated. Search engines read this to discover pages they might miss by just following links. This is especially important for dynamic content like individual artist profiles and blog posts — without a sitemap, Google would need to find every artist page by crawling links, which is slow and incomplete.

**Priority:** P0
**Effort:** Medium

**Implementation:**
- Add `GET /sitemap.xml` Express route in `server/routes.ts`
- Query the database for all public entities (artists, published blog posts, active exhibitions)
- Generate XML following the [Sitemaps protocol](https://www.sitemaps.org/protocol.html)
- Set `Content-Type: application/xml`
- Cache response for 1 hour (avoid hitting DB on every crawler request)

**Static pages to include:**
```
/                   (homepage)
/gallery            (3D gallery)
/exhibitions        (exhibitions listing)
/store              (artwork store)
/auctions           (auction listing)
/artists            (artist directory)
/blog               (blog listing)
/privacy            (privacy policy)
/terms              (terms of service)
/changelog          (changelog)
```

**Dynamic pages to include:**
```
/artists/:id        (one entry per artist)
/blog/:id           (one entry per published blog post)
```

**XML format:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://vernis9.art/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vernis9.art/artists/abc-123</loc>
    <lastmod>2026-03-31</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- ... -->
</urlset>
```

**Acceptance criteria:**
- [ ] `GET /sitemap.xml` returns valid XML
- [ ] All static public routes are listed
- [ ] All artists are listed with their IDs
- [ ] All published blog posts are listed
- [ ] Response is cached (not a DB query per request)
- [ ] `lastmod` is set where data is available

---

### 3. Server-Side Meta Tag Injection

**What it does:** When someone shares a link to `vernis9.art/artists/jane-doe` on Facebook, Twitter, or Slack, those platforms send a bot to fetch the page and read the `<title>` and `<meta>` tags to generate a preview card (the box with a title, description, and image). Right now, every page returns the same generic title "Vernis9 - Virtual Art Gallery & Marketplace" because the server sends identical HTML for all routes. This change makes the server read the URL, fetch the relevant data from the database, and inject the correct title/description/image into the HTML before sending it — so each page gets its own preview.

This also helps Google, which reads `<title>` and `<meta name="description">` to decide what text to show in search results.

**Priority:** P0
**Effort:** Large

**Implementation:**

Modify `server/static.ts` to intercept known routes, look up data, and replace placeholders in `index.html` before serving.

**Step 1 — Add placeholders to `client/index.html`:**
```html
<title>__META_TITLE__</title>
<meta name="description" content="__META_DESCRIPTION__" />
<meta property="og:title" content="__META_TITLE__" />
<meta property="og:description" content="__META_DESCRIPTION__" />
<meta property="og:image" content="__META_IMAGE__" />
<meta property="og:url" content="__META_URL__" />
<meta property="og:type" content="__META_TYPE__" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="__META_TITLE__" />
<meta name="twitter:description" content="__META_DESCRIPTION__" />
<meta name="twitter:image" content="__META_IMAGE__" />
<link rel="canonical" href="__META_URL__" />
```

**Step 2 — Route-specific meta data in `server/static.ts`:**

| Route Pattern | Title | Description | Image | OG Type |
|---|---|---|---|---|
| `/` | Vernis9 - Virtual Art Gallery & Marketplace | (site description) | /og-default.jpg | website |
| `/artists/:id` | {artist.name} - Vernis9 | {artist.bio, truncated 160 chars} | {artist.avatarUrl} | profile |
| `/blog/:id` | {post.title} - Vernis9 Blog | {post.excerpt, truncated 160 chars} | {post.coverImageUrl} | article |
| `/store` | Art Store - Vernis9 | Browse and purchase original artworks... | /og-default.jpg | website |
| `/gallery` | 3D Virtual Gallery - Vernis9 | Explore our immersive 3D museum... | /og-default.jpg | website |
| `/exhibitions` | Exhibitions - Vernis9 | Curated exhibitions featuring... | /og-default.jpg | website |
| `/auctions` | Auctions - Vernis9 | Bid on exclusive artworks... | /og-default.jpg | website |
| `/artists` | Artists - Vernis9 | Discover talented artists... | /og-default.jpg | website |
| `/blog` | Blog - Vernis9 | Art world insights and stories... | /og-default.jpg | website |
| (all other) | Vernis9 - Virtual Art Gallery & Marketplace | (site description) | /og-default.jpg | website |

**Step 3 — Default OG image:**
- Create `/client/public/og-default.jpg` — a 1200x630 branded image (the standard OG image size) with the Vernis9 logo and tagline. Used when no specific image is available.

**Step 4 — `react-helmet-async` for client-side navigation:**
- Install `react-helmet-async`
- Wrap `App` in `<HelmetProvider>`
- Add `<Helmet>` in each page component to update `<title>` during SPA navigation (so the browser tab title changes as users navigate)
- Server-side injection handles the initial load (for crawlers); Helmet handles subsequent SPA navigations (for users)

**Acceptance criteria:**
- [ ] `curl https://vernis9.art/artists/:id` returns HTML with that artist's name in `<title>` and `<og:title>`
- [ ] `curl https://vernis9.art/blog/:id` returns HTML with that post's title and cover image
- [ ] Social platform link previews show correct title/description/image per page
- [ ] Browser tab title updates on SPA navigation
- [ ] Canonical URL matches the current page
- [ ] Default fallback meta tags work for routes without specific data

---

### 4. Structured Data (JSON-LD)

**What it does:** Structured data is a standardized format (JSON inside a `<script>` tag) that explicitly tells search engines what type of content is on the page — "this is an artwork by this artist, at this price" or "this is a blog post published on this date." Without it, Google has to guess from the page text. With it, Google can display "rich snippets" — enhanced search results with images, prices, ratings, or author info that stand out and get more clicks.

**Priority:** P1
**Effort:** Medium

**Implementation:**

Inject JSON-LD `<script>` tags server-side alongside the meta tag injection (Work Item 3). Each route type gets its own schema.

**Homepage — Organization:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Vernis9",
  "url": "https://vernis9.art",
  "logo": "https://vernis9.art/favicon.svg",
  "description": "Virtual art gallery and marketplace",
  "sameAs": []
}
```

**Homepage — WebSite + SearchAction** (enables Google sitelinks search box, added in #501):
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Vernis9",
  "url": "https://vernis9.art/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://vernis9.art/store?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Homepage — FAQPage** (enables FAQ rich result, added in #501):
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Vernis9?",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    }
  ]
}
```
FAQ copy is hard-coded in `shared/faqs.ts` (5 entries covering what Vernis9 is, who can sell, commission policy, how to buy, shipping). Both the server (JSON-LD in `server/meta.ts`) and the client (visible accordion section on the homepage) import from this single source of truth. Google's FAQPage rich-result guidelines require that the Q&A content be visible on the page, so the accordion is not optional — keep it in sync with the schema. Changes to FAQ copy require a PR — there is no admin UI.

**Artist profile — Person:**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Artist Name",
  "url": "https://vernis9.art/artists/:id",
  "image": "avatar URL",
  "description": "Artist bio",
  "jobTitle": "Artist",
  "knowsAbout": "specialization"
}
```

**Blog post — BlogPosting:**
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Post Title",
  "image": "cover image URL",
  "datePublished": "ISO date",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Vernis9"
  },
  "description": "Post excerpt"
}
```

**Artwork (store/gallery) — VisualArtwork:**
```json
{
  "@context": "https://schema.org",
  "@type": "VisualArtwork",
  "name": "Artwork Title",
  "image": "image URL",
  "creator": {
    "@type": "Person",
    "name": "Artist Name"
  },
  "description": "Artwork description",
  "artMedium": "medium",
  "offers": {
    "@type": "Offer",
    "price": "price",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
```

**Sitewide — BreadcrumbList:**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://vernis9.art/" },
    { "@type": "ListItem", "position": 2, "name": "Artists", "item": "https://vernis9.art/artists" },
    { "@type": "ListItem", "position": 3, "name": "Artist Name" }
  ]
}
```

**Acceptance criteria:**
- [x] Homepage has Organization JSON-LD
- [x] Homepage has WebSite + SearchAction JSON-LD (#501)
- [x] Homepage has FAQPage JSON-LD (#501)
- [x] Artist pages have Person JSON-LD
- [x] Blog posts have BlogPosting JSON-LD
- [x] Google Rich Results Test validates the structured data
- [x] JSON-LD is present in the raw HTML (not injected by JavaScript)

---

### 5. Image Lazy Loading

**What it does:** By default, the browser downloads every image on the page as soon as the HTML loads — even images far below the fold that the user hasn't scrolled to yet. Adding `loading="lazy"` to `<img>` tags tells the browser to only download images when they're about to enter the viewport. This makes the initial page load faster, which directly improves the Core Web Vitals scores that Google uses as a ranking signal.

**Priority:** P1
**Effort:** Small

**Implementation:**
- Add `loading="lazy"` to all `<img>` tags **except** above-the-fold hero images (those should load eagerly for LCP — Largest Contentful Paint)
- Hero images on the home page should stay eager (default) or use `loading="eager"` explicitly

**Files to modify:**
- `client/src/pages/home.tsx` — hero images stay eager, artist cards get lazy
- `client/src/pages/store.tsx` — artwork grid images get lazy
- `client/src/pages/artists.tsx` — artist avatar images get lazy
- `client/src/pages/blog.tsx` — cover images get lazy
- `client/src/pages/exhibitions.tsx` — exhibition images get lazy
- `client/src/components/artwork-card.tsx` — lazy (used in grids)
- `client/src/components/artwork-detail-dialog.tsx` — lazy

**Acceptance criteria:**
- [ ] All below-the-fold images have `loading="lazy"`
- [ ] Hero/above-the-fold images do NOT have `loading="lazy"`
- [ ] Lighthouse performance score improves (or stays same)

---

### 6. Alt Text Audit

**What it does:** The `alt` attribute on images serves two purposes: (1) accessibility — screen readers read it aloud for visually impaired users, and (2) SEO — search engines use alt text to understand what an image depicts, which helps pages rank in image search results. Most images in the app have alt text, but some decorator and fallback images are missing it.

**Priority:** P2
**Effort:** Small

**Implementation:**
- Audit all `<img>` tags and ensure meaningful alt text
- Decorative-only images (backgrounds, dividers) should use `alt=""` (empty alt, not missing alt) to tell screen readers to skip them
- Avatar images should include the person's name: `alt="Profile photo of {artist.name}"`

**Acceptance criteria:**
- [ ] No `<img>` tag without an `alt` attribute
- [ ] Decorative images use `alt=""`
- [ ] Content images have descriptive alt text

---

## Implementation Order

```
Phase 1 (Foundation)          Phase 2 (Rich Content)       Phase 3 (Polish)
┌─────────────────────┐       ┌──────────────────────┐     ┌─────────────────┐
│ 1. robots.txt       │       │ 4. JSON-LD           │     │ 6. Alt text     │
│ 2. Sitemap          │  -->  │ 5. Image lazy load   │ --> │    audit        │
│ 3. Meta injection   │       │                      │     │                 │
│    + react-helmet   │       │                      │     │                 │
│    + OG default img │       │                      │     │                 │
└─────────────────────┘       └──────────────────────┘     └─────────────────┘
```

**Phase 1** is the critical path — without it, the site is essentially invisible to search engines beyond the homepage. Phase 2 enhances how the site appears in results. Phase 3 is cleanup.

## Dependencies

- Work Item 3 requires the `SITE_URL` environment variable (e.g., `https://vernis9.art`) for generating absolute URLs. Add to `.env.example`.
- Work Item 3 depends on a default OG image asset being created.
- Work Item 4 (JSON-LD) builds on the server-side injection infrastructure from Work Item 3.

## Verification

After implementation, validate with:
- [Google Rich Results Test](https://search.google.com/test/rich-results) — structured data
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — OG tags
- [Twitter Card Validator](https://cards-dev.twitter.com/validator) — Twitter cards
- [Google Search Console](https://search.google.com/search-console) — sitemap submission, indexing status
- Lighthouse SEO audit (Chrome DevTools) — overall score

## Search-Engine Property Ownership

Recorded for handoff continuity — if access to a property is ever lost, this is who to contact / which account to recover.

| Search engine | Property | Verification method | Owner account |
|---|---|---|---|
| Google Search Console | `https://vernis9.art` (URL prefix) | _to be recorded_ | `<owner: Liviu's primary Google account>` |
| Google Search Console | `https://vernis9.nl` (URL prefix — 301 redirect to `.art`, registered to track redirect signals) | _to be recorded_ | `<owner: Liviu's primary Google account>` |
| Bing Webmaster Tools | `https://vernis9.art` | XML file (`client/public/BingSiteAuth.xml`, served at `/BingSiteAuth.xml`) | `<owner: Liviu's primary Microsoft account>` |

**When adding new properties:** record the verification method here (file / meta tag / DNS / analytics) and update if the method ever changes. The verification artifact itself (file or meta tag) lives in `client/public/` or `client/index.html` so it survives redeploys — never rely solely on a `docker cp` into a running container.
