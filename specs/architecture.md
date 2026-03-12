# ArtVerse — Architecture & Software Specification

## 1. What This Software Does

ArtVerse is a full-stack art gallery platform that combines e-commerce with an immersive 3D virtual museum experience. It allows artists to showcase their work in procedurally generated Three.js gallery rooms, sell artwork through an online store and live auction system, and engage their audience through a blog. The platform also exposes an MCP (Model Context Protocol) server for AI-assisted content generation.

### Core Capabilities

- **3D Virtual Museum** — First-person walkable gallery with per-artist exhibition rooms (Three.js WebGL)
- **Online Art Store** — Browse, search, filter, and purchase artworks with a cart/checkout flow
- **Live Auctions** — Real-time bidding with validation (minimum increments, time windows)
- **Artist Dashboard** — Full CRUD for artworks, blog posts, order management, and profile settings
- **Blog System** — Artists can publish posts with cover images and excerpts
- **Exhibition System** — Curated group exhibitions with wall placement metadata
- **MCP Server** — 14 resources, 12 tools, 4 prompt templates for AI integration
- **OIDC Authentication** — Google OAuth (configurable) with auto-created artist profiles

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client (React 18 + Vite)                    │
│                                                                     │
│  Wouter Router ─→ Pages ─→ Components (Shadcn/Radix + Three.js)    │
│  TanStack Query (server state)    Zustand (cart, localStorage)      │
│  Tailwind CSS + Dark Mode                                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (JSON API)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Server (Express 5 + TypeScript)                │
│                                                                     │
│  routes.ts ──────→ storage.ts (IStorage) ──────→ db.ts (Drizzle)   │
│  mcp.ts ─────────→ storage.ts                                       │
│  auth/ ──────────→ Passport.js + OIDC + connect-pg-simple           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ SQL (node-postgres)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                                  │
│                                                                     │
│  users, sessions, artists, artworks, auctions, bids,               │
│  orders, exhibitions, exhibition_artworks, blog_posts              │
└─────────────────────────────────────────────────────────────────────┘
```

**Monorepo layout:**

```
Art-World-Hub/
├── client/src/           React frontend
│   ├── pages/            10 page components
│   ├── components/       3D galleries, cards, dialogs, 47 Shadcn UI components
│   ├── hooks/            use-auth, use-toast, use-mobile
│   └── lib/              queryClient, cart-store, utils
├── server/               Express backend
│   ├── routes.ts         40+ API endpoints
│   ├── storage.ts        34-method database layer (IStorage interface)
│   ├── mcp.ts            MCP server (AI integration)
│   ├── seed.ts           Demo data seeder
│   ├── __tests__/        70+ unit & integration tests
│   └── replit_integrations/auth/   OIDC authentication
├── shared/
│   └── schema.ts         Single source of truth: Drizzle tables, Zod schemas, TS types
├── script/build.ts       Production build orchestrator
├── .github/workflows/    CI (typecheck+build) and CD (Docker→GHCR)
├── docker-compose.yml    PostgreSQL + app containers
└── Dockerfile            Multi-stage Node 20 build
```

---

## 3. Database Schema

All tables defined in `shared/schema.ts` using Drizzle ORM. IDs are UUIDs (varchar).

### Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **users** | id, email (unique), firstName, lastName, profileImageUrl, createdAt, updatedAt | Authentication accounts |
| **sessions** | sid (PK), sess (jsonb), expire | PostgreSQL session store |
| **artists** | id, userId (FK→users), name, bio, avatarUrl, country, specialization, email, galleryLayout (jsonb), socialLinks (jsonb) | Artist profiles |
| **artworks** | id, title, description, imageUrl, artistId (FK→artists), price (decimal), medium, dimensions, year, isForSale, isInGallery, isReadyForExhibition, exhibitionOrder, category | Art pieces |
| **auctions** | id, artworkId (FK→artworks), startingPrice, currentBid, minimumIncrement, startTime, endTime, status, winnerName | Live auctions |
| **bids** | id, auctionId (FK→auctions), bidderName, amount, timestamp | Auction bids |
| **orders** | id, artworkId (FK→artworks), buyerName, buyerEmail, shippingAddress, totalAmount, status, createdAt | Purchase orders |
| **exhibitions** | id, name, description, layout (text/JSON), isActive, createdAt | Curated shows |
| **exhibition_artworks** | id, exhibitionId (FK), artworkId (FK), wallId, position | Wall placement in exhibitions |
| **blog_posts** | id, artistId (FK→artists), title, content, excerpt, coverImageUrl, isPublished, createdAt, updatedAt | Artist blog entries |

### Order Status State Machine

```
pending ──→ communicating ──→ sending ──→ closed
   │              │               │          │
   └──→ canceled ←┘───── canceled ←┘─ canceled
```

Any non-terminal state can transition to `canceled`.

### Composite Types (exported from schema)

- `ArtworkWithArtist` — Artwork joined with its Artist
- `AuctionWithArtwork` — Auction joined with ArtworkWithArtist
- `ExhibitionWithArtworks` — Exhibition with all placed artworks
- `BlogPostWithArtist` — Blog post joined with Artist
- `OrderWithArtwork` — Order joined with ArtworkWithArtist
- `MazeLayout` — 3D gallery definition: `{ width, height, cells: MazeCell[], spawnPoint }`
- `MazeCell` — `{ x, z, walls: { north, south, east, west }, artworkSlots[] }`

---

## 4. API Endpoints

All routes defined in `server/routes.ts`. Base path: `/api/`.

### Artists
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/artists` | No | List all artists |
| GET | `/api/artists/me` | Yes | Current user's artist profile (auto-creates if missing) |
| GET | `/api/artists/:id` | No | Get artist by ID |
| GET | `/api/artists/:id/artworks` | No | Get artist's artworks |
| GET | `/api/artists/:id/gallery` | No | Get artist's 3D gallery layout + exhibition artworks |
| GET | `/api/artists/:id/orders` | Yes | Get orders for artist's artworks |
| GET | `/api/artists/:id/blog` | No | Get artist's blog posts |
| PATCH | `/api/artists/:id` | Yes | Update artist profile |

### Artworks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/artworks` | No | List all artworks (joined with artist) |
| GET | `/api/artworks/:id` | No | Get artwork by ID |
| POST | `/api/artworks` | Yes | Create artwork (regenerates gallery if exhibition-ready) |
| PATCH | `/api/artworks/:id` | Yes | Update artwork (regenerates gallery on readiness change) |
| DELETE | `/api/artworks/:id` | Yes | Delete artwork (cascades to bids, auctions, orders, exhibition entries) |

### Auctions & Bids
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auctions` | No | List all auctions (with artwork + artist) |
| GET | `/api/auctions/:id` | No | Get auction by ID |
| GET | `/api/auctions/:id/bids` | No | Get bids for auction (desc by timestamp) |
| POST | `/api/auctions/:id/bids` | No | Place bid (validates timing + minimum increment) |

### Orders
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/orders` | No | List all orders |
| POST | `/api/orders` | No | Create order (marks artwork not-for-sale, sends email) |
| PATCH | `/api/orders/:id/status` | Yes | Transition order status (enforces state machine) |

### Exhibitions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exhibitions` | No | List all exhibitions |
| GET | `/api/exhibitions/active` | No | Get current active exhibition |
| GET | `/api/exhibitions/:id` | No | Get exhibition with placed artworks |

### Blog Posts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/blog` | No | List published blog posts |
| GET | `/api/blog/:id` | No | Get blog post by ID |
| POST | `/api/blog` | Yes | Create blog post |
| PATCH | `/api/blog/:id` | Yes | Update blog post |
| DELETE | `/api/blog/:id` | Yes | Delete blog post |

### Gallery
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gallery/hallway` | No | Get hallway museum data (all artists with exhibition artworks) |

### Utilities
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/image-proxy` | No | Proxy external images (CORS bypass, 1-day cache) |

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/user` | Yes | Get current authenticated user |
| GET | `/api/login/google` | No | Initiate OIDC login flow |
| GET | `/api/callback` | No | OIDC callback handler |
| POST | `/api/logout` | Yes | End session |

### MCP (Model Context Protocol)
| Method | Path | Description |
|--------|------|-------------|
| POST/GET/DELETE | `/mcp` | Stateful MCP endpoint (session per connection) |

---

## 5. Frontend Pages & Routing

Router: Wouter (lightweight, `<Route path="...">` pattern). Defined in `client/src/App.tsx`.

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `home.tsx` (178 lines) | Landing page — hero section, feature cards, featured artworks carousel |
| `/gallery` | `gallery.tsx` (352 lines) | Virtual gallery — toggle between 3D museum hallway and classic framed viewer |
| `/store` | `store.tsx` (270 lines) | Art store — search, category/sort filters, grid/list toggle, detail dialogs |
| `/auctions` | `auctions.tsx` (506 lines) | Auction platform — active/upcoming/ended tabs, bid placement, stats |
| `/artists` | `artists.tsx` (243 lines) | Artist directory — search, featured cards, detail dialogs |
| `/artists/:id` | `artist-profile.tsx` (358 lines) | Artist profile — 3D maze gallery, portfolio, blog tabs |
| `/dashboard` | `artist-dashboard.tsx` (1214 lines) | Artist management — artworks CRUD, blog, orders, profile settings |
| `*` | `not-found.tsx` (21 lines) | 404 page |

### App Layout Structure

```
App
├── QueryClientProvider (TanStack Query)
├── ThemeProvider (dark/light theme)
├── TooltipProvider (Radix)
├── SidebarProvider
│   ├── AppSidebar (navigation: Home, Gallery, Store, Artists, Dashboard)
│   └── Main Content
│       ├── Header (sticky: sidebar trigger, cart sheet, theme toggle)
│       └── Router (page outlet)
```

---

## 6. 3D Gallery System

Two Three.js WebGL components power the virtual museum experience.

### HallwayGallery3D (`components/hallway-gallery-3d.tsx` — 1151 lines)

The main museum entrance. A long hallway with doorways branching off to individual artist rooms.

- First-person controls: WASD movement, mouse look
- Per-artist labeled rooms with exhibition artworks on walls
- Mesh-based collision detection
- Smooth room entry/exit transitions
- Ambient + directional lighting
- Texture caching with Promise-based loading
- Constants: cell size 2.5u, wall thickness 0.15u, player height 1.5u, move speed 0.08u/frame

### MazeGallery3D (`components/maze-gallery-3d.tsx` — 1288 lines)

Individual artist exhibition rooms displayed on artist profile pages.

- Procedurally generated white-room layout from backend `galleryLayout` JSONB
- 5x5 grid default, scales with artwork count
- Artworks placed on perimeter walls (north → west → south → east)
- Interactive artwork inspection with zoom
- Shopping cart integration directly from 3D view
- Artist info poster at spawn point
- Mini-map visualization
- Fullscreen toggle

### Gallery Layout Generation (server-side)

`generateWhiteRoomLayout(artworkCount)` in `storage.ts`:
- Room size: `max(3, ceil((artworkCount+1)/4) + 2)` squared
- Artwork slots distributed around the perimeter walls
- Spawn point at center-bottom of room
- Stored as JSONB in `artists.galleryLayout`
- Regenerated automatically when artwork exhibition readiness changes

---

## 7. State Management

| Layer | Tool | Location | Purpose |
|-------|------|----------|---------|
| Server state | TanStack Query | `lib/queryClient.ts` | API data fetching/caching. `staleTime: Infinity`, no auto-refetch, no retry. |
| Client state | Zustand | `lib/cart-store.ts` | Shopping cart persisted to localStorage. Methods: addItem, removeItem, clearCart, getTotal, getItemCount. |
| Auth state | Custom hook | `hooks/use-auth.ts` | User fetch, logout, isAuthenticated check. |
| Theme state | Context | `components/theme-provider.tsx` | Dark/light/system mode with localStorage persistence. |

### Query Key Patterns
```
["/api/artworks"]
["/api/artists"]
["/api/artists", artistId]
["/api/artists", artistId, "artworks"]
["/api/artists", artistId, "gallery"]
["/api/auctions"]
["/api/gallery/hallway"]
["/api/blog"]
```

---

## 8. Authentication

Implemented in `server/replit_integrations/auth/`.

- **Protocol:** OIDC (OpenID Connect) via `openid-client` v6
- **Default provider:** Google (`accounts.google.com`)
- **Strategy:** Passport.js with `ClientSecretPost` authentication
- **Sessions:** PostgreSQL-backed via `connect-pg-simple`, 7-day TTL, HttpOnly/Secure/SameSite=Lax cookies
- **Auto-provisioning:** On first login, a user record is upserted and an artist profile is auto-created
- **Host validation:** Optional `OIDC_ALLOWED_HOSTS` whitelist (comma-separated)
- **User lookup:** By stable email key with upsert-on-conflict

---

## 9. MCP Server

Endpoint: `POST/GET/DELETE /mcp` with `mcp-session-id` header. Stateful per-session instances using Streamable HTTP transport.

### Resources (14)
Data access points for AI clients: all-artists, artist-by-id, all-artworks, artworks-by-artist, artwork-by-id, all-auctions, auction-by-id, auction-bids, orders-by-artist, blog-posts, blog-posts-by-artist, artist-gallery, exhibitions.

### Tools (12)
| Tool | Purpose |
|------|---------|
| `create_artwork` | Create new artwork with full metadata |
| `update_artwork` | Update artwork details |
| `delete_artwork` | Delete artwork with cascade |
| `place_bid` | Place auction bid with validation |
| `create_order` | Create purchase order |
| `update_order_status` | Transition order through state machine |
| `update_artist_profile` | Update artist info and social links |
| `create_blog_post` | Create blog post |
| `update_blog_post` | Update blog post |
| `delete_blog_post` | Delete blog post |
| `search_artworks` | Full-text search with category/medium/artist filters |
| `regenerate_gallery` | Manually rebuild artist's 3D gallery layout |

### Prompt Templates (4)
| Template | Purpose |
|----------|---------|
| `artwork_description` | Generate gallery/store listing text |
| `blog_draft` | Draft 400-800 word blog post in artist voice |
| `order_summary` | Analyze artist's sales data and recommend next steps |
| `artist_bio` | Write professional 2-3 paragraph bio |

---

## 10. UI Framework & Design System

- **Component library:** Shadcn UI (47 components in `components/ui/`)
- **Primitives:** Radix UI (fully accessible, keyboard-navigable)
- **Styling:** Tailwind CSS with CSS custom properties for theming
- **Primary color:** Orange `#F97316`
- **Typography:** Playfair Display (serif headings) + Inter (sans body)
- **Dark mode:** Class-based toggle with system detection
- **Icons:** Lucide React + React Icons (social)
- **Charts:** Recharts (data visualization)
- **Carousel:** Embla Carousel
- **Forms:** React Hook Form + Zod validation

---

## 11. Build & Deployment

### Development
```bash
npm run dev    # tsx hot-reload on port 5000, Vite HMR for client
```

### Production Build (`script/build.ts`)
1. Vite bundles client → `dist/public/`
2. esbuild bundles server → `dist/index.cjs` (CJS, minified, tree-shaken)
3. Selective dependency bundling via allowlist (reduces cold-start time)

### Docker
- **Multi-stage Dockerfile:** deps → build → run (Node 20 slim)
- **docker-compose.yml:** PostgreSQL 16 Alpine + app, health checks, named volume for data persistence
- Ports: PostgreSQL on 5433, app on 5000 (localhost only)

### CI/CD (GitHub Actions)
- **ci.yml:** On every push/PR — type check (6GB heap for tsc) + full build with PostgreSQL service container
- **deploy.yml:** On push to main — build Docker image, push to GitHub Container Registry (ghcr.io) with `latest` + commit SHA tags

---

## 12. Testing

Framework: Vitest. Tests in `server/__tests__/`.

### Test Structure
- **storage.test.ts** — 29 unit tests: gallery layout generation algorithm, mocked DatabaseStorage methods, cascading delete verification
- **routes.test.ts** — 40+ integration tests: HTTP endpoint validation with supertest, input validation (Zod), auction bid rules, order state machine enforcement, gallery regeneration triggers
- **helpers/test-app.ts** — Test fixture: mocked storage + auth, Express app factory
- **helpers/mock-storage.ts** — Full IStorage mock (32 `vi.fn()` stubs)

### Running Tests
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npx vitest run <file>       # Single file
```

---

## 13. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Express session signing key |
| `SEED_DB` | No | `false` | Seed demo data on startup |
| `PORT` | No | `5000` | Server listen port |
| `NODE_ENV` | No | `development` | Environment mode |
| `OIDC_ISSUER_URL` | No | `https://accounts.google.com` | OIDC provider URL |
| `OIDC_CLIENT_ID` | No | — | OAuth client ID |
| `OIDC_CLIENT_SECRET` | No | — | OAuth client secret |
| `OIDC_ALLOWED_HOSTS` | No | — | Comma-separated allowed redirect hosts |

---

## 14. Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| React | 18.3 | UI framework |
| Express | 5.0 | HTTP server |
| Drizzle ORM | 0.39 | Database ORM (push mode, no migrations) |
| PostgreSQL (pg) | 8.16 | Database driver |
| Three.js | 0.182 | 3D WebGL rendering |
| Vite | 7.3 | Frontend build tool + dev server |
| TanStack Query | 5.60 | Server state management |
| Zustand | 5.0 | Client state management |
| Wouter | 3.3 | Client-side routing |
| Passport | 0.7 | Authentication middleware |
| openid-client | 6.8 | OIDC protocol |
| Zod | 3.24 | Schema validation |
| @modelcontextprotocol/sdk | 1.26 | MCP server |
| Resend | 4.0 | Email notifications |
| esbuild | 0.25 | Server bundler |
| Vitest | 3.2 | Test framework |
| TypeScript | 5.6 | Type system |

---

## 15. Seed Data

When `SEED_DB=true`, the application seeds:
- **1 artist:** Alexandra C. (Romanian/Dutch reverse glass painter)
- **18 artworks:** Reverse glass paintings + oil paintings (mix of for-sale and sold)
- **1 blog post:** "Opening the Studio Door" (published)
- **1 exhibition:** "Grand Opening Exhibition" (active, with wall placements)
- **Pre-generated gallery layout:** 7x7 white room with artworks on perimeter walls
