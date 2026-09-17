# Feature: SEO (Search Engine Optimization)

**Status:** In Progress
**Last Updated:** 2026-09-17
**Owner:** Architecture

## Summary

Prepare Vernis9 for search engine discovery and social sharing. The site is a client-side SPA served by Express — crawlers currently see identical HTML for every route. This spec adds the infrastructure needed for Google, Bing, and social platforms to properly index and display each page.

## Current State (Audit)

| Area | Status | Notes |
|------|--------|-------|
| `robots.txt` | Done | #364, #376 — dynamic route at `/robots.txt` (blocks indexing on non-production) |
| `sitemap.xml` | Done | #365 — dynamic endpoint at `/sitemap.xml`; #504 — Google image-sitemap namespace + `<image:image>` for artist avatars, artwork images (title + caption), and blog cover images |
| Per-page meta tags | Done | #366 — server-side injection + react-helmet-async |
| Structured data (JSON-LD) | Done | #367 — Organization, Person, BlogPosting, BreadcrumbList; #501 — WebSite+SearchAction, FAQPage (homepage); #503 — VisualArtwork + Offer on `/artworks/:slug`; #535 — `sameAs` on Person JSON-LD (derived from `artists.socialLinks`) |
| Public artwork detail pages | Done | #503 — `/artworks/:slug` server-rendered meta + JSON-LD, sitemap entries |
| Twitter cards | Done | #366 — `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| Canonical URLs | Done | #366 — `<link rel="canonical">` on every page |
| www → non-www redirect | Done | #385 — nginx 301 redirect `www.vernis9.art` → `vernis9.art` |
| Trailing-slash canonicalization | Done | #427 — homepage canonical fixed; nginx strips trailing slash from non-root paths |
| Image lazy loading | Done | #368 — `loading="lazy"` on all below-the-fold images |
| OG image | Done | #366 — default `og-default.png` + per-entity images |
| Semantic HTML | Done | #505 — `<main>`/`<nav>` landmarks confirmed present (already existed via `public-layout.tsx`/`top-nav.tsx`, contra #496's curl-based finding — see Work Item 9); heading-order skips fixed on `/store`, `/artists`, `/auctions`, `/gallery`; `<section>` landmarks added to `/artists/:slug` |
| URL structure | Done | `/artists/:slug` (#537) and `/artworks/:slug` (#503) — slug format `slugify(name|title)-<first-8-chars-of-uuid>`. Old UUID artist URLs 301-redirect to the slug form |
| Alt text | Done | #369 — all img and AvatarImage have descriptive alt text |
| HTTP status on unknown routes | Done | #508 — SPA catch-all returned 200 for every URL (soft-404); now 404s unknown static routes and dynamic routes whose entity doesn't exist |
| Cumulative Layout Shift (artist profile) | Done | #553 — loading skeletons on `/artists/:slug` reshaped to match the loaded layout's geometry (banner + card container, gallery grid, blog cards), instead of a structurally different placeholder |

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://vernis9.art/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://vernis9.art/artists/abc-123</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>https://cdn.example.com/avatars/a.jpg</image:loc>
      <image:title>Alexandra</image:title>
    </image:image>
  </url>
  <url>
    <loc>https://vernis9.art/artworks/my-piece-abc123</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>https://cdn.example.com/images/piece.jpg</image:loc>
      <image:title>My Piece</image:title>
      <image:caption>A reverse glass painting, hand-finished.</image:caption>
    </image:image>
  </url>
  <!-- ... -->
</urlset>
```

**Image sitemap rules (#504):**
- Namespace `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` on the `<urlset>` root.
- Every published artwork URL carries a single `<image:image>` (`imageUrl` is NOT NULL on the schema).
- Artist URL carries `<image:image>` only when `avatarUrl` is set — a URL with no image is fine.
- Blog post URL carries `<image:image>` only when `coverImageUrl` is set.
- `<image:title>` is truncated to 100 chars; `<image:caption>` to 500. Both are XML-escaped — every user-supplied string on the sitemap must go through `xmlEscape()`.
- Relative image paths are absolutized against `SITE_URL`.

**Acceptance criteria:**
- [ ] `GET /sitemap.xml` returns valid XML
- [ ] All static public routes are listed
- [ ] All artists are listed with their IDs
- [ ] All published blog posts are listed
- [ ] Response is cached (not a DB query per request)
- [ ] `lastmod` is set where data is available
- [ ] `xmlns:image` namespace is declared on the root element
- [ ] Every artwork URL has `<image:image>` with `<image:title>` + `<image:caption>`

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

**Artwork detail (`/artworks/:slug`) — VisualArtwork** (implemented in #503, only when `isPublished = true`):
```json
{
  "@context": "https://schema.org",
  "@type": "VisualArtwork",
  "name": "Artwork Title",
  "url": "https://vernis9.art/artworks/red-harbor-sunset-4b2c19a7",
  "image": "image URL",
  "description": "Artwork description (≤160 chars)",
  "creator": {
    "@type": "Person",
    "name": "Artist Name",
    "url": "https://vernis9.art/artists/:artistId"
  },
  "artMedium": "Oil on canvas",
  "dateCreated": "2024",
  "genre": "Painting",
  "offers": {
    "@type": "Offer",
    "price": "1250.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "url": "https://vernis9.art/artworks/red-harbor-sunset-4b2c19a7"
  }
}
```
`offers` is only emitted when `artwork.isForSale && price > 0`. Structured width/height are intentionally omitted — `dimensions` is a free-text column, not structured; a follow-up issue can add `widthCm`/`heightCm` if we decide to enrich.

The URL scheme is `/artworks/<slugified-title>-<first-8-chars-of-uuid>` (e.g. `/artworks/red-harbor-sunset-4b2c19a7`). Slug generation lives in `shared/artwork-slug.ts` and is used both by the SQL backfill in migration `0008_superb_silver_centurion.sql` and by the server-side `createArtwork` path, so all rows — existing and new — have a stable, unique slug. Privacy gate: `isPublished = true` is required; drafts 404.

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

**Security — script-context escaping (#683):** several of the objects above embed
attacker-controllable DB fields — artist `name`/`bio`, artwork `title`, gallery
`name`, blog `title`. `JSON.stringify` does not escape `<`, `>` or `&`, so a value
like an artist bio of `</script><script>...` would close the JSON-LD `<script>` tag
early and inject a sibling script that runs for every visitor of that page — stored
XSS. `injectMetaTags` in `server/meta.ts` unicode-escapes `<` `>` `&` (plus the
` `/` ` line separators, valid in JSON but not in raw script-context text)
after `JSON.stringify` and before embedding the payload — `escapeJsonForScript()`.
This is representational only: a JSON parser reads the escaped payload back to the
identical object. The other meta-tag replacements (title, description, OG fields)
already went through `escapeHtml()`; JSON-LD was the one gap. Regression coverage:
`server/__tests__/meta.test.ts` — "injectMetaTags — JSON-LD script-context escaping".

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

### 7. Real HTTP 404s for Unknown SPA Routes

**What it does:** The SPA catch-all in `server/static.ts` (and its dev-mode counterpart `server/vite.ts`) serves `index.html` for every URL that doesn't hit a static asset or API route, always with a `200` status — including URLs that don't correspond to anything, like `/this-page-does-not-exist` or `/artists/<deleted-uuid>`. Google treats "200 + page that says not found" as a soft-404, which downranks the whole site's crawl quality (#496, audit gap §3.14).

**Priority:** P3 (low)
**Effort:** Small

**Implementation:**
- `server/meta.ts`'s `resolveMetaTags()` already classifies every URL as one of: a known static SEO route (`STATIC_ROUTES`), a known non-SEO app route (`KNOWN_NON_SEO_ROUTES` — `/dashboard`, `/curator`, `/admin`, `/auth`, `/auth/set-password`, `/koningsdag`; mirrors `client/src/App.tsx`'s route list), a dynamic route resolved against the DB (`/artists/:slug`, `/artworks/:slug`, `/blog/:id`, `/curator-gallery/:id`), or unresolved. It now also returns `notFound: boolean` reflecting that classification — the SPA catch-all didn't need a second, separate router; the existing per-URL resolution used for meta tags already **is** the route registry the issue asked for.
- A DB error during a dynamic lookup does **not** produce a 404 — an error means "unknown," not "confirmed absent," so it fails open to `200`. Only a lookup that successfully completes and finds nothing sets `notFound: true`.
- `server/static.ts`'s catch-all (`createSpaCatchAllHandler`) and `server/vite.ts`'s dev-mode catch-all both read `meta.notFound` and set the response status accordingly, while still serving the SPA shell either way — the client-side router's own `NotFound` component renders the same page a real 404 does, so nothing about what the visitor sees changes, only the status code.

**Acceptance criteria:**
- [x] `curl -I https://vernis9.art/this-page-does-not-exist` → `HTTP/1.1 404`
- [x] `curl -I https://vernis9.art/artists/nonexistent-uuid` → `HTTP/1.1 404`
- [x] Real pages (static and dynamic) still 200
- [x] User-facing 404 page still renders (SPA shell served on both 200 and 404)

---

### 8. Cumulative Layout Shift (CLS) — Artist Profile

**What it does:** CLS measures how much visible content jumps around as a page loads. Google folds it into Core Web Vitals, and a high score both hurts ranking and reads as a janky page to users. Lighthouse 12 mobile runs against `/artists/:slug` post-#550 (which fixed compression and, incidentally, made the artist page's LCP fast enough for Lighthouse's measurement window to actually catch the layout shifts happening underneath) showed CLS bouncing between 0 and ~0.21 across repeated runs — well into the "poor" band (Google's threshold for "good" is < 0.1).

**Priority:** P2 (medium — real CWV/ranking impact, but LCP/FCP work in #551 matters more)
**Effort:** Small

**Root cause:** the page renders three independent loading states — the top-level `artistLoading` gate, and per-tab `galleryLoading`/`artworksLoading`/`blogLoading` gates — and each one's `<Skeleton>` placeholder had a different shape and height than the content that replaces it:
- The whole-page loading skeleton used a plain `p-6 space-y-6` wrapper with generic bars, while the loaded page uses a `h-48` gradient banner + a `max-w-5xl mx-auto -mt-24` card pulled up underneath it — a structural swap, not just a content swap.
- The default-active "Gallery" tab's skeleton was a single fixed `h-[500px]` block, standing in for content that is actually a responsive grid of artwork cards (or a 3D canvas, or an empty state) — heights that don't resemble 500px in the common case.
- The "Blog" tab's skeleton was three `h-40` bars, shorter than the real cards (a 3:1 cover image plus a header with date/title/excerpt).

The avatar image (a candidate raised in the issue, and the reason #549 added `fetchPriority="high"` to it) turned out **not** to be a contributor: its parent `<Avatar>` already renders at a fixed `w-32 h-32` regardless of image load state, so there is no box to reflow.

**Implementation:**
- `client/src/pages/artist-profile.tsx`: the `artistLoading` skeleton now reuses the loaded layout's own banner + `max-w-5xl`/`-mt-24` card structure, with skeleton shapes sized to the real avatar/name/bio geometry inside it.
- The Gallery tab's loading state is now a `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` of card-shaped skeletons (matching `ArtworkCard`'s `aspect-4/5` image + two text lines) instead of one flat block.
- The Blog tab's loading state is now three `Card`s with an `aspect-3/1` image skeleton and header-line skeletons, matching the real post card's shape.

**Acceptance criteria:**
- [x] Loading and loaded states share the same outer geometry for the profile header (banner height, container width, negative-margin overlap)
- [x] Per-tab skeletons approximate the real content's shape and total height rather than an arbitrary fixed block
- [ ] Re-running Lighthouse 5× on the deployed instance shows CLS ≤ 0.1 on at least 4/5 runs (lab verification, tracked as a post-merge follow-up — see PR `## Verification`)

---

### 9. Semantic HTML Pass — Landmarks & Heading Hierarchy

**What it does:** Screen readers and crawlers use `<main>`/`<nav>` landmarks and heading levels (`<h1>` → `<h2>` → `<h3>`, never skipping a level) to build a page outline. A skipped level or a missing landmark doesn't break the visual page, but it breaks the *assistive* navigation of it, and axe/Lighthouse both score it as an accessibility violation.

**Priority:** P2
**Effort:** Small

**Findings vs. #496's audit:** the audit (a curl-based external check, run before JS execution) reported no `<main>`/`<nav>` anywhere. Both already existed in the rendered DOM — `public-layout.tsx` has wrapped every non-bare route in `<main>` since #289, and `top-nav.tsx` already had a desktop `<nav>` — just not in the raw pre-hydration HTML a non-JS fetch sees. Lighthouse and axe DevTools, the tools this issue's acceptance criteria actually name, render through Chrome and see the hydrated DOM. What *was* real: `store.tsx`, `artists.tsx`, `auctions.tsx`, and `gallery.tsx`'s classic image viewer rendered their first sub-heading as `<h3>` directly under the page's `<h1>`, skipping `<h2>` — a genuine `heading-order` violation, matching the issue's own gallery example.

**Implementation:**
- `top-nav.tsx`: `aria-label="Primary"` on the desktop `<nav>`; the mobile menu's wrapping `<div>` became a second `<nav aria-label="Mobile">` (only one is ever visible per breakpoint — same pattern the component already uses for two logo variants).
- `store.tsx`, `artists.tsx`, `auctions.tsx`: results grid/tabs wrapped in `<section aria-labelledby>` with a visually-hidden (`sr-only`) `<h2>` ahead of the grid, so existing `<h3>` card titles (from the shared `ArtworkCard`/`AuctionCard` components, unchanged) nest correctly instead of skipping a level. `sr-only` was chosen over promoting the shared card components' heading level so `home.tsx`'s and `exhibitions.tsx`'s already-correct `h2` section title → `h3` card title nesting isn't flattened.
- `gallery.tsx`: added the same `sr-only` `<h2>` before the viewMode-conditional content (fixes the classic viewer's caption `<h3>`); promoted the "Gallery Coming Soon" empty state from `<h2>` to `<h1>` since it is the page's only heading in that state.
- `blog-post.tsx`, `artwork-detail.tsx`: promoted the "Post not found" / "Artwork not found" states from `<h2>` to `<h1>` for the same reason.
- `artist-profile.tsx`: bio card and the gallery/portfolio/blog tabs area each wrapped in a labelled `<section>`, with a hidden `<h2>` ahead of the tabs so their `<h3>` artwork/post titles nest correctly under the page's `<h1>` (artist name).

**Acceptance criteria:**
- [x] Every public page (home, gallery, store, auctions, exhibitions, artists, artist-profile, blog, blog-post) has exactly one `<h1>` in its default render state
- [x] No heading level is skipped going deeper, on any of the pages above
- [x] Top navigation (desktop and mobile) is inside a `<nav>` landmark
- [x] Page content is inside a `<main>` landmark (pre-existing, confirmed rather than re-added)
- [x] `artist-profile.tsx` has `<section>` landmarks around the bio and artworks/tabs areas
- [ ] Lighthouse Accessibility + SEO score does not drop, and axe DevTools "page has heading-order" passes — both require a rendered-browser run against the deployed instance; not something CI's `npm test` exercises (see PR `## Verification`)

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
