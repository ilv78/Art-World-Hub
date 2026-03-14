# ArtVerse — Data Model

**Status:** Active
**Last Updated:** 2026-03-14
**Owner:** Architecture

---

## Schema Source

All tables defined using Drizzle ORM. Main schema in `shared/schema.ts`, auth tables in `shared/models/auth.ts`. IDs are UUIDs (varchar, `gen_random_uuid()`).

## Database Management

- **Staging:** Push mode (`drizzle-kit push --force`) — fast, auto-applies on container start. Staging data is disposable.
- **Production:** Migration mode (`drizzle-kit migrate`) — applies versioned SQL files from `migrations/`. Safe, predictable, tracked.
- **Docker entrypoint** checks `DB_MIGRATION_MODE` env var to select mode.

---

## Tables

| Table | Source File | Key Columns | Purpose |
|-------|-----------|-------------|---------|
| **users** | `shared/models/auth.ts` | id, email (unique), password (nullable, bcrypt hash), emailVerified (boolean), role (varchar, default "user" — user/curator/admin), firstName, lastName, profileImageUrl, createdAt, updatedAt | Authentication accounts (OIDC + local) with RBAC |
| **sessions** | `shared/models/auth.ts` | sid (PK), sess (jsonb), expire | PostgreSQL session store (connect-pg-simple) |
| **magic_links** | `shared/models/auth.ts` | id, email, token (unique), expiresAt, usedAt, createdAt | Email signup verification tokens (1-hour expiry, single-use) |
| **artists** | `shared/schema.ts` | id, userId (FK→users), name, bio, avatarUrl, country, specialization, email, galleryLayout (jsonb), socialLinks (jsonb) | Artist profiles |
| **artworks** | `shared/schema.ts` | id, title, description, imageUrl, artistId (FK→artists), price (decimal), medium, dimensions, year, isForSale, isInGallery, isReadyForExhibition, exhibitionOrder, category | Art pieces |
| **auctions** | `shared/schema.ts` | id, artworkId (FK→artworks), startingPrice, currentBid, minimumIncrement, startTime, endTime, status, winnerName | Live auctions |
| **bids** | `shared/schema.ts` | id, auctionId (FK→auctions), bidderName, amount, timestamp | Auction bids |
| **orders** | `shared/schema.ts` | id, artworkId (FK→artworks), buyerName, buyerEmail, shippingAddress, totalAmount, status, createdAt | Purchase orders |
| **exhibitions** | `shared/schema.ts` | id, name, description, layout (text/JSON), isActive, createdAt | Curated shows |
| **exhibition_artworks** | `shared/schema.ts` | id, exhibitionId (FK), artworkId (FK), wallId, position | Wall placement in exhibitions |
| **blog_posts** | `shared/schema.ts` | id, artistId (FK→artists), title, content, excerpt, coverImageUrl, isPublished, createdAt, updatedAt | Artist blog entries |

---

## Order Status State Machine

```
pending ──→ communicating ──→ sending ──→ closed
   │              │               │          │
   └──→ canceled ←┘───── canceled ←┘─ canceled
```

Any non-terminal state can transition to `canceled`.

---

## Composite Types (exported from schema)

- `ArtworkWithArtist` — Artwork joined with its Artist
- `AuctionWithArtwork` — Auction joined with ArtworkWithArtist
- `ExhibitionWithArtworks` — Exhibition with all placed artworks
- `BlogPostWithArtist` — Blog post joined with Artist
- `OrderWithArtwork` — Order joined with ArtworkWithArtist
- `MazeLayout` — 3D gallery definition: `{ width, height, cells: MazeCell[], spawnPoint }`
- `MazeCell` — `{ x, z, walls: { north, south, east, west }, artworkSlots[] }`

---

## Migration Files

Migration files live in `migrations/` and are tracked in git. Drizzle uses `migrations/meta/_journal.json` to track which migrations have been applied. The `__drizzle_migrations` table in the database records applied migrations.

| Migration | Description |
|-----------|-------------|
| `0000_sturdy_frightful_four.sql` | Baseline: 10 tables, all foreign keys and indexes |
| `0001_illegal_famine.sql` | Add `password`, `email_verified` to users; create `magic_links` table |
| `0002_noisy_iron_monger.sql` | Add `role` column to users (varchar, default "user", NOT NULL) |

### Schema Change Workflow

1. Edit `shared/schema.ts` (or `shared/models/auth.ts`)
2. Run locally: `npm run db:push` to apply to your local DB
3. Test the changes locally
4. Generate a migration file: `npx drizzle-kit generate`
5. Review the generated SQL in `migrations/`
6. Commit both the schema change and the migration file

### Caution

- **Adding** columns/tables is safe
- **Renaming** columns generates DROP + CREATE (data loss) — write a custom migration instead
- **Removing** columns generates DROP (data loss) — back up first
