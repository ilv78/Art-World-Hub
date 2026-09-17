# Feature: Marketplace

**Status:** Active
**Last Updated:** 2026-09-17
**Owner:** Architecture

## Summary

Art marketplace where visitors browse artworks for sale, add items to a persistent cart, and place orders. Artists manage incoming orders through a status workflow. Email notifications are sent to both buyer and artist on order creation via Resend.

## User Story

As a buyer, I want to browse artworks, add them to my cart, and place an order, so that I can purchase art from ArtVerse artists.

As an artist, I want to manage my orders through a status workflow, so that I can track fulfillment from purchase to delivery.

## Acceptance Criteria

- [x] Store page (`/store`) lists artworks where `isForSale = true` (drafts are excluded — `isForSale` is clamped to false while an artwork is unpublished, see artist-dashboards/SPEC.md § Draft vs Published)
- [x] Filter by category, search by text, sort options
- [x] Artwork detail dialog with full specs, artist info, add-to-cart button
- [x] Cart sidebar (Zustand + localStorage persistence) with item count badge
- [x] Checkout dialog: buyer name, email, shipping address
- [x] One order created per cart item (parallel POST requests)
- [x] Artwork marked `isForSale = false` in the same transaction as order creation (#687 — prior to this, nothing ever cleared the flag after an order, so a one-of-a-kind piece could be sold to two buyers)
- [x] At most one active (non-canceled) order per artwork enforced at the DB level, closing the race between two orders that both read `isForSale = true` before either write lands (#687)
- [x] Artwork re-listed (`isForSale = true`) when its active order is canceled (#687)
- [x] Email confirmation sent to buyer and artist (via Resend)
- [x] Artist dashboard Orders tab shows all orders for their artworks
- [x] Order status transitions enforced by state machine

## Technical Design

### Order Status State Machine

```
pending → communicating → sending → closed
   ↓           ↓             ↓         ↓
canceled    canceled      canceled   canceled
```

Any non-canceled status can transition to `canceled`. Transitions validated server-side via `ORDER_TRANSITIONS` map. Any transition landing on `canceled` — including from `closed` (a completed sale later refunded) — re-lists the artwork.

### Preventing oversold one-of-a-kind artworks (#687)

`orders` carries a partial unique index, `IDX_orders_artwork_active`, on `artwork_id` `WHERE status <> 'canceled'` (see `specs/architecture/DATA-MODEL.md`). This is the enforcement layer; the `isForSale` check in `POST /api/orders` is only a fast-path UX rejection (`400`) and cannot by itself close the race between two requests that both read `isForSale = true` before either order is inserted.

- `storage.createOrder` inserts the order and sets `artworks.isForSale = false` inside one `db.transaction`.
- A second concurrent order for the same artwork loses the race against the unique index (Postgres `23505`), which `createOrder` translates into `ArtworkAlreadySoldError`. `POST /api/orders` maps that to `409` ("This artwork was just sold to another buyer").
- `storage.updateOrderStatus` sets `artworks.isForSale = true` inside the same transaction as the status update, whenever the new status is `canceled`.

### Database Tables

- `artworks` — `id`, `title`, `description`, `imageUrl`, `artistId`, `price`, `medium`, `dimensions`, `year`, `isPublished`, `isForSale`, `isInGallery`, `isReadyForExhibition`, `exhibitionOrder`, `category`
- `orders` — `id`, `artworkId`, `buyerName`, `buyerEmail`, `shippingAddress`, `totalAmount`, `status`, `createdAt`. Partial unique index `IDX_orders_artwork_active` on `artworkId` where `status <> 'canceled'`.

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/artworks` | No | List all artworks (with artist embedded) |
| GET | `/api/artworks/:id` | No | Artwork detail |
| POST | `/api/orders` | No | Create order, mark artwork not for sale, send emails. `400` if not for sale/price-on-request, `409` if a concurrent order won the race |
| GET | `/api/orders` | No | List all orders |
| GET | `/api/artists/:id/orders` | Yes | Orders for artist's artworks |
| PATCH | `/api/orders/:id/status` | Yes | Update order status (artist must own artwork); re-lists the artwork when the new status is `canceled` |

### Cart Architecture

- **State manager:** Zustand store (`client/src/lib/cart-store.ts`)
- **Persistence:** localStorage
- **Quantity:** Fixed at 1 per artwork (no quantity selector)
- **Checkout:** Creates one `POST /api/orders` per cart item

### Email Notifications

On order creation:
- **Buyer:** Confirmation email with order summary, artwork details, shipping info
- **Artist:** New order alert with buyer details, artwork details
- Sent via Resend; gracefully skips if not configured

## Dependencies

- Zustand — Cart state management with localStorage persistence
- TanStack React Query — Server state fetching
- Resend — Email notifications
- Authentication feature — Artist order management requires login

## Open Questions

None — feature is stable and deployed.
