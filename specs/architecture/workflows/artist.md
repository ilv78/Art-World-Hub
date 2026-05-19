# Artist Workflow

**Status:** Active
**Last Updated:** 2026-05-19
**Owner:** Architecture

An artist is an authenticated user with `role=user` and an associated record in the `artists` table. Artist profiles are auto-created on first login. Artists upload, exhibit, and sell their own artworks, and fulfill incoming orders.

## Journey

```mermaid
flowchart TD
    A[Sign in:<br/>Google OIDC or<br/>email/password] --> B[User + artist<br/>auto-created on<br/>first login]
    B --> C[Artist dashboard]

    C --> D{What to do?}

    D -->|Profile| E[Edit profile:<br/>avatar, bio, country,<br/>specialization, socials]

    D -->|Artwork| F[Upload artwork]
    F --> F1[Set title, medium,<br/>dimensions, price]
    F1 --> F2[Upload image:<br/>variants generated<br/>server-side]
    F2 --> F3{Publish?}
    F3 -->|No| F4[Draft — hidden]
    F3 -->|Yes| F5[Published —<br/>visible in store]
    F5 --> F6{Ready for<br/>exhibition?}
    F6 -->|Yes| F7[Set wall order →<br/>3D maze regenerated]
    F6 -->|No| F5

    D -->|Auction| G[Start auction:<br/>set reserve + end date]
    G --> G1[Bids come in]
    G1 --> G2[Auction ends →<br/>winner notified]

    D -->|Blog| H[Create post:<br/>cover, content, publish]
    H --> H1[Visible on<br/>artist profile blog]

    D -->|Orders| I[View incoming orders]
    I --> I1[Transition status:<br/>pending → communicating<br/>→ sending → closed]
    I1 --> I2[Or cancel at any<br/>non-closed state]
    I --> J[See order-lifecycle.md]

    D -->|Share| K[Copy public<br/>profile URL]
```

## Key entry points

- Dashboard: `client/src/pages/artist-dashboard.tsx`
- Auth: `server/replit_integrations/auth/` (Passport + OIDC + local)
- Routes: `server/routes.ts` — artwork CRUD, auction creation, order status transitions
- Storage layer: `server/storage.ts` (`DatabaseStorage`)
- Image variants: `server/lib/artwork-image.ts`, `script/backfill-artwork-variants.ts`
- Gallery layout regeneration: triggered when `isReadyForExhibition` toggles on any artwork

## Ownership rules

- Artists may only modify their **own** artworks, auctions, blog posts, and orders. Ownership is checked in route handlers (`server/routes.ts`).
- Curators (`role=curator`) **cannot** have an artist profile — creating one returns 403 (`server/routes.ts:406`).
- Artists cannot self-promote to curator or admin — only an admin can change roles.

## Order fulfillment

See [`order-lifecycle.md`](./order-lifecycle.md) for the full state machine. The artist owns the transition from `pending` onward; visitors only create orders in the `pending` state.
