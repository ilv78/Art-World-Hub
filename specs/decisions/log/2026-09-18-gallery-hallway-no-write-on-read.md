---
date: 2026-09-18
title: Gallery GET endpoints never write; hallway N+1 replaced with one batched join
issue: 691
category: Architecture
---

`/api/gallery/hallway` and `/api/artists/:id/gallery` are public GETs that performed DB
**writes** on the read path. The hallway route computed a "staleness" heuristic per
artist — comparing the stored layout's slot count against `readyArtworks.length + 1` —
and called `regenerateArtistGallery()`, a real `UPDATE`, inline whenever the numbers
didn't match or no layout existed yet. The single-artist gallery route did the same
whenever `galleryLayout` was simply missing. This was deliberately added in #28/#29
(2026-03-11, see `specs/features/3d-gallery/CHANGELOG.md`) to fix artworks missing from
a stale layout, but it traded that bug for three others: N concurrent visitors to the
hallway race the same `UPDATE` on the same artist row; the hallway wrapped every
artist's per-artist query in one `Promise.all`, so one artist's query failure 500'd the
whole page; and the route ran one `getExhibitionReadyArtworks` join per artist (N+1),
with no caching, on every page view.

**Chosen: regenerate only on mutation, read-only on GET.** The mutation paths already
call `regenerateArtistGallery()` on every artwork create/update/delete that touches
`isReadyForExhibition` or `exhibitionOrder` (`server/routes.ts`, the artwork
POST/PATCH/DELETE handlers) — the write side of this was never missing, only
duplicated onto the read side. Both GET routes now treat a missing layout as an
**unpersisted** `generateWhiteRoomLayout()` call — the same pure function
`regenerateArtistGallery` calls before its `UPDATE` — so a first-time visitor still
gets a correctly-shaped room without the route writing anything. The hallway route
additionally leans on the client's own fallback (`generateDefaultLayout()` in
`hallway-gallery-3d.tsx`), which already existed and already covered this case; the
server-side "staleness" branch was fixing a problem the client had already stopped
having.

**Chosen: batch the hallway's N+1 into the join that already existed.**
`storage.getAllExhibitionReadyArtworks()` — used today by
`GET /api/curator/artworks/available` — already joins `artworks` to `artists` filtered
on `isReadyForExhibition`, across every artist, in one query. The hallway route now
calls it once instead of once per artist, and groups the rows by `artistId` in JS. That
method orders by `artist.name, artwork.title` for its curator-facing caller, which is
the wrong order for a gallery room (`hallway-gallery-3d.tsx` indexes
`room.artworks[artworkIndex]` positionally against the layout's wall slots, which are
assigned by `exhibitionOrder`). Rather than fork the query or add an order parameter,
each artist's group is re-sorted by `(exhibitionOrder, title)` in JS after grouping —
the same order `getExhibitionReadyArtworks()` used per-artist before, at negligible
cost since each group is small.

**Rejected: caching the hallway response.** Would also fix the N+1 cost and the
thundering-herd write, but adds invalidation surface (every mutation path would need to
bust it) for a problem the batched join already solves without a cache's staleness
window. Worth revisiting if the artist count grows enough that one join stops being
cheap.

**Consequences accepted.** The hallway response's `galleryLayout` field can now be
`null` for an artist with no stored layout (previously always non-null, because the
route wrote one in on first read); the client already handles this via
`generateDefaultLayout()`. No schema change, no migration, no new endpoint.

**To reverse:** restore the per-artist `Promise.all` and the slot-count staleness check
in `server/routes.ts`'s hallway handler, and drop `getExhibitionReadyArtworks` back into
`/api/artists/:id/gallery`'s regenerate-on-missing branch. Both are pure code changes,
revertible in one PR.
