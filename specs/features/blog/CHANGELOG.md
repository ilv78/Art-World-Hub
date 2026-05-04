# Blog — Changelog

## 2026-05-04 — Blog post back button returns to actual referrer (#586)

- `/blog/:id` "Back to Blog" hardcoded `<Link href="/blog">` replaced with a smart back handler. Label is now neutral `"Back"`. Behavior: walk one step up `window.history` when there is any prior session entry (so the user returns to the artist profile / `/blog` list / search / wherever they came from inside the SPA); fall back to navigating to `/blog` only on cold landings (`history.length === 1` — shared link, bookmark, search engine, new tab).
- `document.referrer` was considered first but is unreliable for SPA navigation (wouter uses `pushState` — `referrer` only updates on full page loads).

## 2026-05-04 — Artist profile Blog tab links to detail page (#582)

- Each blog card on `/artists/:slug` Blog tab is now wrapped in `<Link href="/blog/:id">` (previously plain text title with full body inline → no path to the detail page or its share buttons).
- Dropped the inline `<p>{post.content}</p>` from the artist tab — the tab is now a teaser list (cover + title + excerpt + date). Detail page is the single source of truth for full post + share. Side benefit: removes a duplicate-content SEO penalty (same body was rendered on both `/artists/:slug` and `/blog/:id`).

## 2026-02 (Initial)
- Blog list page (`/blog`) with 3-column grid
- Post detail page (`/blog/:id`) with cover image and artist link
- Dashboard blog tab with create/edit/delete
- Cover image upload via dedicated endpoint
- Publish toggle (draft vs published visibility)
