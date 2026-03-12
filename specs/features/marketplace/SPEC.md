# Feature: Marketplace

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

Art marketplace where visitors browse artworks for sale, add items to a persistent cart, and place orders. Artists manage incoming orders through a status workflow. Email notifications are sent to both buyer and artist on order creation via Resend.

## User Story

As a buyer, I want to browse artworks, add them to my cart, and place an order, so that I can purchase art from ArtVerse artists.

As an artist, I want to manage my orders through a status workflow, so that I can track fulfillment from purchase to delivery.

## Acceptance Criteria

- [x] Store page (`/store`) lists all artworks where `isForSale = true`
- [x] Filter by category, search by text, sort options
- [x] Artwork detail dialog with full specs, artist info, add-to-cart button
- [x] Cart sidebar (Zustand + localStorage persistence) with item count badge
- [x] Checkout dialog: buyer name, email, shipping address
- [x] One order created per cart item (parallel POST requests)
- [x] Artwork marked `isForSale = false` immediately on order creation
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

Any non-canceled status can transition to `canceled`. Transitions validated server-side via `ORDER_TRANSITIONS` map.

### Database Tables

- `artworks` — `id`, `title`, `description`, `imageUrl`, `artistId`, `price`, `medium`, `dimensions`, `year`, `isForSale`, `isInGallery`, `isReadyForExhibition`, `exhibitionOrder`, `category`
- `orders` — `id`, `artworkId`, `buyerName`, `buyerEmail`, `shippingAddress`, `totalAmount`, `status`, `createdAt`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/artworks` | No | List all artworks (with artist embedded) |
| GET | `/api/artworks/:id` | No | Artwork detail |
| POST | `/api/orders` | No | Create order, mark artwork not for sale, send emails |
| GET | `/api/orders` | No | List all orders |
| GET | `/api/artists/:id/orders` | Yes | Orders for artist's artworks |
| PATCH | `/api/orders/:id/status` | Yes | Update order status (artist must own artwork) |

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
