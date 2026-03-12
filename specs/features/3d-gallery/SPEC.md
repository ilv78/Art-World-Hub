# Feature: 3D Gallery System

**Status:** Active
**Last Updated:** 2026-03-12
**Owner:** Architecture

## Summary

WebGL-based 3D virtual museum built with Three.js. Two distinct gallery modes: a museum hallway containing multiple artist rooms (main gallery page), and individual maze-style exhibition rooms (artist profile page). Gallery layouts are auto-generated server-side based on exhibition-ready artworks and stored as JSONB on the `artists.galleryLayout` column.

## User Story

As a visitor, I want to walk through a virtual 3D museum, explore artist rooms, and view artworks on gallery walls, so that I can experience art in an immersive environment.

## Acceptance Criteria

- [x] Hallway gallery renders a central corridor with artist rooms on left and right
- [x] Maze gallery renders a single-room exhibition with artworks on walls
- [x] First-person navigation with WASD/arrow keys and mouse look (pointer lock)
- [x] Click artwork to select and view details (exits pointer lock)
- [x] Collision detection prevents walking through walls
- [x] Artist poster displayed at first slot with name, country, specialization, bio, avatar
- [x] Name plaques at hallway room entrances
- [x] Texture loading with retry logic (3 attempts), caching, and fallback
- [x] Image proxy for CORS-blocked external images
- [x] Gallery layout auto-regenerates when `isReadyForExhibition` or `exhibitionOrder` changes
- [x] Classic 2D carousel fallback view available on gallery page

## Technical Design

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `HallwayGallery3D` | `client/src/components/hallway-gallery-3d.tsx` (1,148 lines) | Museum hallway with multiple artist rooms |
| `MazeGallery3D` | `client/src/components/maze-gallery-3d.tsx` (1,288 lines) | Individual artist exhibition room |
| Gallery page | `client/src/pages/gallery.tsx` | Main 3D/Classic toggle view |
| Artist profile | `client/src/pages/artist-profile.tsx` | Artist's personal maze gallery tab |

### Layout Generation Algorithm

Server-side function `generateWhiteRoomLayout(artworkCount)` in `server/storage.ts`:

1. Calculate room dimensions: `width = max(3, wallsPerSide + 2)`, `height = max(3, wallsPerSide + 2)`
2. `wallsPerSide = ceil((artworkCount + 1) / 4)` — +1 accounts for door on south wall
3. Create grid of cells with boundary walls (north/south/east/west)
4. Place artwork slots around perimeter: north (L→R), west (T→B), south (R→L, skip door), east (T→B)
5. Spawn point at center-x, 3 units from south wall
6. Store as JSONB in `artists.galleryLayout`

### Data Structures

```typescript
interface MazeCell {
  x: number; z: number;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
  artworkSlots: { wallId: string; position: number }[];
}
interface MazeLayout {
  width: number; height: number;
  cells: MazeCell[];
  spawnPoint: { x: number; z: number };
}
```

### Rendering Constants

| Constant | Hallway | Maze |
|----------|---------|------|
| Cell size | 2.5 | 2.5 |
| Wall height | 3.0 | 3.5 |
| Player height | 1.5 | 1.5 |
| Move speed | 0.08 | 0.1 |
| Look speed | 0.002 | 0.003 |

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/gallery/hallway` | All artist rooms with layouts and exhibition-ready artworks |
| GET | `/api/artists/:id/gallery` | Individual artist room layout + artworks |

### Regeneration Triggers

Layout regenerates when:
- Artwork `isReadyForExhibition` flag changes
- Artwork `exhibitionOrder` changes
- Exhibition-ready artwork is deleted
- Manual via MCP tool `regenerate_gallery`
- Stale layout detected on `/api/gallery/hallway` (slot count mismatch)

## Dependencies

- `three` v0.182.0 — WebGL 3D rendering
- React 18 hooks (`useEffect`, `useRef`, `useState`, `useCallback`)
- TanStack React Query — gallery data fetching
- Image proxy (`/api/image-proxy`) for CORS-blocked textures

## Open Questions

None — feature is stable and deployed.
