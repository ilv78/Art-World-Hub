# Visitor Workflow

**Status:** Active
**Last Updated:** 2026-05-19
**Owner:** Architecture

The visitor is an unauthenticated public user. They can browse all published content, build a cart, and check out as a guest. No account required.

## Journey

```mermaid
flowchart TD
    A[Land on home page] --> B{What to do?}
    B -->|Browse| C[Hallway 3D / 2D gallery]
    B -->|Search| D[Store: filter artworks]
    B -->|Read| E[Blog posts]

    C --> F[Enter artist room]
    D --> G[View artwork detail]
    F --> G
    E --> H[View artist profile]
    H --> F

    G --> I{Action?}
    I -->|Add to cart| J[Cart updated<br/>localStorage via Zustand]
    I -->|Bid| K{Authenticated?}
    I -->|Share| L[Share buttons:<br/>copy link, social]

    K -->|No| M[Sign in prompt]
    K -->|Yes| N[Place bid]

    J --> O[Continue browsing or checkout]
    O --> P[Checkout page]
    P --> Q[Enter buyer name,<br/>email, address]
    Q --> R[Place order]
    R --> S[Order confirmation email<br/>via Resend]
    S --> T[Order status: pending]
```

## Key entry points

- Home: `client/src/pages/home.tsx`
- Gallery hallway: `client/src/pages/gallery.tsx` → `components/hallway-gallery-3d.tsx`
- Store: `client/src/pages/store.tsx`
- Artwork detail: `client/src/pages/artwork-detail.tsx`
- Artist profile: `client/src/pages/artist-profile.tsx` → `components/maze-gallery-3d.tsx`
- Blog: `client/src/pages/blog.tsx`, `client/src/pages/blog-post.tsx`
- Checkout: `client/src/pages/checkout.tsx`

## Notes

- Cart is persisted to `localStorage` (`client/src/lib/cart-store.ts`) — survives navigation and page reloads.
- Guest checkout is supported: order creation accepts buyer details without an authenticated session.
- Bidding requires authentication (`isAuthenticated` middleware on `POST /api/auctions/:id/bids`).
- Sharing artworks generates Open Graph cards server-side; analytics are logged via `share_events` (#503).
