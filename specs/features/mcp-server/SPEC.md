# Feature: MCP Server

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

Model Context Protocol (MCP) server exposing ArtVerse data and operations to AI assistants. Provides 13 resources for reading data, 12 tools for mutations, and 4 prompt templates for AI-assisted content generation. Uses Streamable HTTP transport with stateful per-session instances.

## User Story

As an AI assistant (Claude), I want to access ArtVerse data and perform operations via MCP, so that I can help artists manage their galleries, artworks, and content.

## Acceptance Criteria

- [x] MCP endpoint at `POST/GET/DELETE /mcp`
- [x] Stateful per-session instances with UUID session IDs
- [x] 13 resources for querying artists, artworks, auctions, orders, blog, gallery, exhibitions
- [x] 12 tools for creating/updating/deleting artworks, blog posts, orders, bids, artist profiles, gallery
- [x] 4 prompt templates for content generation (artwork description, blog draft, order summary, artist bio)
- [x] Zod schema validation on all tool inputs
- [x] Uses shared `DatabaseStorage` singleton for all data access
- [x] Session cleanup on transport close

## Technical Design

### Transport

- **Protocol:** Streamable HTTP over `POST/GET/DELETE /mcp`
- **Session management:** Random UUID per session, stored in memory `Map<sessionId, {transport, server}>`
- **Headers:** `mcp-session-id` header for subsequent requests after initialization
- **Lifecycle:** Session created on first POST, cleaned up on DELETE or transport close

### Resources (13)

| Resource | URI Pattern | Description |
|----------|-------------|-------------|
| all-artists | `artverse://artists` | List all artists |
| artist-by-id | `artverse://artists/{artistId}` | Artist profile by ID |
| all-artworks | `artverse://artworks` | All artworks with artist info |
| artworks-by-artist | `artverse://artists/{artistId}/artworks` | Artworks for specific artist |
| artwork-by-id | `artverse://artworks/{artworkId}` | Artwork details |
| all-auctions | `artverse://auctions` | All auctions |
| auction-by-id | `artverse://auctions/{auctionId}` | Auction with bids |
| auction-bids | `artverse://auctions/{auctionId}/bids` | Bids for auction |
| orders-by-artist | `artverse://artists/{artistId}/orders` | Orders for artist's artworks |
| blog-posts | `artverse://blog` | All published blog posts |
| blog-posts-by-artist | `artverse://artists/{artistId}/blog` | Blog posts by artist |
| artist-gallery | `artverse://artists/{artistId}/gallery` | Gallery layout + artworks |
| exhibitions | `artverse://exhibitions` | All exhibitions |

### Tools (12)

| Tool | Purpose |
|------|---------|
| `create_artwork` | Create new artwork listing |
| `update_artwork` | Update artwork details |
| `delete_artwork` | Delete artwork |
| `search_artworks` | Search/filter artworks by query, category, medium, sale status |
| `place_bid` | Place bid on active auction |
| `create_order` | Create purchase order (marks artwork not for sale) |
| `update_order_status` | Transition order through status workflow |
| `update_artist_profile` | Update artist info and social links |
| `create_blog_post` | Create blog post |
| `update_blog_post` | Update blog post |
| `delete_blog_post` | Delete blog post |
| `regenerate_gallery` | Regenerate 3D gallery layout |

### Prompt Templates (4)

| Prompt | Parameters | Purpose |
|--------|-----------|---------|
| `artwork_description` | title, medium, artistName, style?, dimensions?, inspiration? | Generate compelling artwork description |
| `blog_draft` | artistName, topic, tone?, keyPoints? | Draft blog post (400-800 words) |
| `order_summary` | artistId | Analyze orders and provide sales insights |
| `artist_bio` | name, specialization?, country?, existingBio?, highlights? | Write/improve artist biography |

### Known Issues

3 MCP `tool()` calls have `@ts-expect-error` comments due to deep type instantiation errors in the MCP SDK during CI type checking. Functionality is unaffected.

### Key File

`server/mcp.ts` — 817 lines, contains all resource definitions, tool implementations, and prompt templates.

## Dependencies

- `@modelcontextprotocol/sdk` v1.26.0 — MCP server framework
- Shared `DatabaseStorage` singleton from `server/storage.ts`
- Zod — Tool input validation schemas

## Open Questions

None — feature is stable and deployed.
