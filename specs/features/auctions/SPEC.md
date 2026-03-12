# Feature: Auction System

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

Time-based auction system where artworks can be listed for bidding. Auctions have start/end times, starting prices, and minimum bid increments. Status is derived from timestamps (upcoming/active/ended). Bidding is anonymous (no authentication required). No payment processing — auctions are informational.

## User Story

As a visitor, I want to browse active auctions and place bids on artworks, so that I can participate in art acquisition events.

## Acceptance Criteria

- [x] Auctions page (`/auctions`) with tabs: Active, Upcoming, Ended
- [x] Stats display: total auctions, active count, total value
- [x] Auction cards show image, title, artist, current/starting price, status badge, time remaining
- [x] Place bid modal for active auctions with name + amount fields
- [x] Client-side validation: bid amount >= current bid + minimum increment
- [x] Server-side validation: auction must be active (within time window), bid meets minimum
- [x] Bid history shown in bid modal (top 5, newest first)
- [x] Upcoming auctions show "Coming Soon" (disabled)
- [x] Ended auctions show "Auction Ended" (disabled)
- [x] Progress bar visualization for active auctions

## Technical Design

### Status Determination

Status is derived client-side from timestamps (no server-side state transitions):
- `now < startTime` → "upcoming"
- `startTime <= now <= endTime` → "active"
- `now > endTime` → "ended"

### Database Tables

- `auctions` — `id`, `artworkId`, `startingPrice`, `currentBid`, `minimumIncrement`, `startTime`, `endTime`, `status`, `winnerName`
- `bids` — `id`, `auctionId`, `bidderName`, `amount`, `timestamp`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/auctions` | No | List all auctions (with artwork + artist) |
| GET | `/api/auctions/:id` | No | Auction detail with bids |
| GET | `/api/auctions/:id/bids` | No | Bid history (newest first) |
| POST | `/api/auctions/:id/bids` | No | Place bid (validates timing + amount) |

### Bid Validation Rules

1. Auction must exist (404 otherwise)
2. Auction must be active: `startTime <= now <= endTime` (400 otherwise)
3. Bid amount >= `currentBid` (or `startingPrice`) + `minimumIncrement`
4. On success: creates bid record, updates auction `currentBid`

### Progress Bar

Calculated as: `min(100, ((currentBid - startingPrice) / startingPrice) * 100 + 50)`, capped at 100%.

### Limitations

- No authentication required for bidding (anonymous)
- No automatic winner determination (manual post-auction)
- `winnerName` field exists but is not populated automatically
- No bid reversal/cancellation
- No auction extension on last-second bids
- No payment flow — auctions are informational
- No admin UI for creating/editing auctions (manual DB inserts)

## Dependencies

- TanStack React Query — Auction data fetching
- Zod — Bid input validation
- Shared database storage layer

## Open Questions

None — feature is stable and deployed.
