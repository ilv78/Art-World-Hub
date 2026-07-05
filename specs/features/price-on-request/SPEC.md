# Price on Request

**Status:** Implemented
**Issue:** #668

## Overview

Artists can mark an artwork as **"Price on request"** (POR) instead of publishing a fixed number. This is standard art-world practice; for this gallery most works are POR. A POR work shows the label "Price on request" everywhere a price would appear, replaces the buy flow with an **Enquire** call-to-action, and cannot be purchased online.

## Data model

Two changes to the `artworks` table (migration `0013_price_on_request.sql`):

- `price` — NOT NULL dropped; now **nullable** (POR works store no numeric price).
- `price_on_request` — new `boolean NOT NULL DEFAULT false`.

DB default is `false` so existing priced works are unaffected. The edit form defaults the toggle **on** for new works.

## Validation

`shared/schema.ts`:

- `insertArtworkSchema` — `.refine()`: price is required unless `priceOnRequest` is true.
- `updateArtworkSchema` — `.refine()`: price is required only when `priceOnRequest` is explicitly set to `false` (so unrelated partial updates aren't blocked).

## Display

Single source of truth: `formatArtworkPrice(artwork)` in `client/src/lib/utils.ts` — returns `"Price on request"` (`PRICE_ON_REQUEST_LABEL`) when `priceOnRequest` is set or `price` is missing, otherwise `formatPrice(price)`. All price render sites route through it (card, detail dialog, detail page, gallery, store, artist profile, admin, both 3D galleries).

## Enquire action

POR works render an **Enquire** button in place of **Add to Cart**. It opens a modal form (`client/src/components/enquiry-dialog.tsx`) collecting the visitor's name, email, and a prefilled message. Submitting `POST`s to `/api/artworks/:id/enquire`, which emails the artist via Resend (reply-to = the visitor). When the artist has no email on file, the enquiry falls back to the site inbox (`getFromEmail()`) so it's never dropped. The endpoint is rate-limited (5 / 15 min / IP) since it sends mail from public input. Enquiries are **not** persisted — email only.

On the artwork card the Enquire button opens the detail dialog (which hosts the modal), keeping cards lightweight.

## Server guards

POR works are not purchasable online. Both order paths reject them (400 / MCP error):

- `POST /api/orders` in `server/routes.ts`
- MCP `create_order` tool in `server/mcp.ts`

## Enquiry endpoint

`POST /api/artworks/:id/enquire` (`server/routes.ts`) — validates `artworkEnquirySchema` (`shared/schema.ts`: name, email, message), looks up the artwork, and emails the artist via `sendArtworkEnquiryEmail()` (reply-to = visitor; site-inbox fallback). Rate-limited via `enquiryLimiter`. Returns 204 on success, 400 invalid, 404 unknown artwork, 503 when email is not configured.

## SEO

`server/meta.ts` already gates the `VisualArtwork` `offers` block on `hasValidPrice` (`Number(price) > 0`), so POR works (null price → 0) automatically omit the Offer — no change needed, no invalid price in JSON-LD.

## Sorting

`store.tsx` price-low / price-high sorts push POR works (no numeric price) to the end in both directions.

## Key files

- `shared/schema.ts` — nullable `price`, `priceOnRequest` column, refine validation
- `migrations/0013_price_on_request.sql` — schema migration
- `client/src/lib/utils.ts` — `formatArtworkPrice`, `PRICE_ON_REQUEST_LABEL`
- `client/src/components/enquiry-dialog.tsx` — the Enquire modal form
- `client/src/pages/artist-dashboard.tsx` — POR toggle in the edit form (defaults on for new works)
- `client/src/components/artwork-card.tsx`, `artwork-detail-dialog.tsx`, `client/src/pages/artwork-detail.tsx` — display + Enquire CTA
- `client/src/pages/{gallery,store,artist-profile,admin}.tsx`, `client/src/components/{maze,hallway}-gallery-3d.tsx` — display
- `shared/schema.ts` — `artworkEnquirySchema`
- `server/routes.ts` — order guard + `POST /api/artworks/:id/enquire` + `sendArtworkEnquiryEmail`; `server/mcp.ts` — order guard
- `server/__tests__/artwork-price.test.ts` — schema + helper unit tests; `routes.test.ts` — POR order rejection + enquiry endpoint
