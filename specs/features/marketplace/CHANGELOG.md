# Marketplace — Changelog

## 2026-09-17
- Fixed one-of-a-kind artworks being oversellable (#687): nothing actually cleared `isForSale` after an order despite the Feb 2026 changelog entry below claiming it did, and there was no DB-level constraint stopping two orders for the same artwork. Added partial unique index `IDX_orders_artwork_active` (`orders.artwork_id` where `status <> 'canceled'`), moved the `isForSale` flip into the same transaction as order creation, added a `409` response (`ArtworkAlreadySoldError`) for the race-loser, and re-list the artwork when its order is canceled.

## 2026-03-12
- Fixed order notification emails in Docker (PR #38, closes #34)
- Resend integration refactored: routes.ts uses `RESEND_API_KEY` env var directly

## 2026-02 (Initial)
- Store page with artwork listing, filtering, and search
- Zustand cart with localStorage persistence
- Checkout dialog with buyer details
- Order creation with automatic `isForSale` flag clearing
- Order status state machine (pending → communicating → sending → closed + canceled)
- Artist order management in dashboard
- Email notifications to buyer and artist via Resend
