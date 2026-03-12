# Marketplace — Changelog

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
