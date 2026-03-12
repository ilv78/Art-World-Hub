# Feature: Exhibition System

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

Exhibition management system that organizes artworks into curated gallery displays. Exhibitions are named collections with layout metadata, linked to artworks via a junction table specifying wall placement and position. Each artist's personal gallery is auto-generated from their exhibition-ready artworks. The system powers both the hallway museum view and individual artist gallery rooms.

## User Story

As a visitor, I want to explore curated exhibitions of artworks in a virtual gallery, so that I can discover art in a meaningful, organized context.

## Acceptance Criteria

- [x] `exhibitions` table stores named collections with description, layout, and active flag
- [x] `exhibition_artworks` junction table links artworks to exhibitions with wall/position
- [x] `GET /api/exhibitions` lists all exhibitions (ordered by creation date)
- [x] `GET /api/exhibitions/active` returns the currently active exhibition
- [x] `GET /api/exhibitions/:id` returns exhibition with populated artworks
- [x] Artist toggles `isReadyForExhibition` on artworks to include in their gallery
- [x] `exhibitionOrder` field controls artwork placement order on walls
- [x] Gallery layout auto-regenerates when exhibition settings change
- [x] Hallway gallery loads all artists with exhibition-ready artworks
- [x] Classic 2D view available as fallback

## Technical Design

### Database Tables

- `exhibitions` — `id`, `name`, `description`, `layout` (text, JSON string), `isActive` (boolean), `createdAt`
- `exhibition_artworks` — `id`, `exhibitionId`, `artworkId`, `wallId`, `position`
- `artists.galleryLayout` — JSONB column storing per-artist maze layout

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/exhibitions` | No | List all exhibitions |
| GET | `/api/exhibitions/active` | No | Get active exhibition |
| GET | `/api/exhibitions/:id` | No | Exhibition with artworks |
| GET | `/api/gallery/hallway` | No | All artist rooms for hallway view |
| GET | `/api/artists/:id/gallery` | No | Individual artist gallery layout + artworks |

### Exhibition-Ready Artwork Flow

1. Artist creates artwork and sets `isReadyForExhibition: true` + `exhibitionOrder`
2. Server calls `storage.regenerateArtistGallery(artistId)`
3. Fetches all ready artworks ordered by `exhibitionOrder`, then title
4. Calls `generateWhiteRoomLayout(count)` to create maze layout
5. Stores layout in `artists.galleryLayout` JSONB column
6. Frontend fetches layout + artworks for 3D rendering

### Limitations

- No admin UI for creating/managing exhibitions (API only)
- MCP tools available for exhibition management
- Only one exhibition can be active at a time
- Artist exhibition control is indirect (via artwork flags, not exhibition entity)

## Dependencies

- 3D Gallery feature — Rendering of exhibition rooms
- Artist dashboards — Exhibition toggle and ordering UI
- Shared database storage layer

## Open Questions

None — feature is stable and deployed.
