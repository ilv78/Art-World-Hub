# Curator Workflow

**Status:** Active
**Last Updated:** 2026-05-19
**Owner:** Architecture

A curator is an authenticated user with `role=curator`. Curators assemble **curated galleries** from existing exhibition-ready artworks across all artists. They do not own artworks and cannot have an artist profile.

Curators are appointed by an admin. See [ADR-0008](../ADR/) for the RBAC design.

## Journey

```mermaid
flowchart TD
    A[Sign in:<br/>email/password or<br/>Google OIDC] --> B[Curator dashboard]
    B --> C[No artist profile<br/>created — 403 if<br/>attempted]

    B --> D{What to do?}

    D -->|Profile| E[Edit name only<br/>no artist fields]

    D -->|Browse| F[List exhibition-ready<br/>artworks across<br/>all artists]
    F --> F1[/api/curator/<br/>artworks/available/]

    D -->|Curate| G[Create curated gallery]
    G --> G1[Set name, description,<br/>start/end dates]
    G1 --> G2[Add artworks from<br/>available pool]
    G2 --> G3[Server regenerates<br/>curated maze layout]
    G3 --> G4{Publish?}
    G4 -->|No| G5[Draft — hidden]
    G4 -->|Yes| G6[Public: appears in<br/>hallway under<br/>curated exhibitions]

    D -->|Manage| H[List own curated<br/>galleries]
    H --> H1[Edit / unpublish /<br/>delete]
```

## Key entry points

- Routes: `server/routes.ts` — `/api/curator/*` guarded by `isCurator` middleware
- Available artworks endpoint: `/api/curator/artworks/available` — returns all published artworks marked `isReadyForExhibition=true`
- Curated gallery storage: persists as records with cross-artist artwork references; layout JSON cached server-side
- Public surface: curated galleries surface in `client/src/components/hallway-gallery-3d.tsx` alongside artist rooms

## Ownership rules

- Curators may only modify **their own** curated galleries.
- Curators cannot edit artworks (only artists and admins can).
- Curators cannot have an artist profile — `POST /api/artists/me` returns 403 for `role=curator` (`server/routes.ts:406`).

## Relationship to artist exhibitions

| Concept | Owner | Scope |
|---------|-------|-------|
| Artist exhibition | Artist | Single artist's own artworks in their maze room |
| Curated gallery | Curator | Selected artworks across many artists in a shared themed maze |

Both are rendered by `components/maze-gallery-3d.tsx` and listed in the main hallway, but the data sources and permission checks are distinct.
