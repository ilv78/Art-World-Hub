# ArtVerse — Architecture Overview

**Status:** Active
**Last Updated:** 2026-03-13
**Owner:** Architecture

---

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
- **Authentication** — Google OIDC + email/password with magic link signup (Resend)

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
│  auth/ ──────────→ Passport.js + OIDC + Local + connect-pg-simple   │
│  email.ts ───────→ Resend (magic links, order notifications)        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ SQL (node-postgres)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                                  │
│                                                                     │
│  users, sessions, magic_links, artists, artworks, auctions, bids,  │
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
│   ├── email.ts          Resend email client (magic links, order emails)
│   ├── seed.ts           Demo data seeder
│   ├── __tests__/        70+ unit & integration tests
│   └── replit_integrations/auth/   Authentication (OIDC + local)
├── shared/
│   ├── schema.ts         Single source of truth: Drizzle tables, Zod schemas, TS types
│   └── models/auth.ts    Auth tables (users, sessions, magic_links)
├── script/build.ts       Production build orchestrator
├── .github/workflows/    CI/CD pipelines
├── deploy/               Docker-compose files, Nginx configs, setup scripts
├── migrations/           Drizzle SQL migration files (versioned)
├── docker-compose.yml    Local dev: PostgreSQL + app containers
└── Dockerfile            Multi-stage Node 20 build
```

---

## 3. API Endpoints

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
| GET | `/api/orders` | Yes | List orders for current user's artist profile only (ownership enforced) |
| POST | `/api/orders` | Yes | Create order (marks artwork not-for-sale, sends email) |
| PATCH | `/api/orders/:id/status` | Yes | Transition order status (enforces state machine + ownership) |

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
| GET | `/api/image-proxy` | No | Proxy external images (CORS bypass, 1-day cache, SSRF-protected) |

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/user` | Yes | Get current authenticated user |
| GET | `/api/auth/config` | No | Auth methods available (googleEnabled) |
| POST | `/api/auth/signup` | No | Send magic link email for signup |
| GET | `/api/auth/verify-email` | No | Consume magic link token, create user |
| POST | `/api/auth/set-password` | Yes | Set password after email verification |
| POST | `/api/auth/login` | No | Email + password login |
| GET | `/api/login/google` | No | Initiate Google OIDC login flow |
| GET | `/api/callback` | No | OIDC callback handler |
| POST | `/api/logout` | Yes | End session |

### MCP (Model Context Protocol)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST/GET/DELETE | `/mcp` | Yes | Stateful MCP endpoint (session per connection, requires authentication) |

---

## 4. Frontend Pages & Routing

Router: Wouter (lightweight, `<Route path="...">` pattern). Defined in `client/src/App.tsx`.

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/` | `home.tsx` | Landing page — hero section, feature cards, featured artworks carousel |
| `/gallery` | `gallery.tsx` | Virtual gallery — toggle between 3D museum hallway and classic framed viewer |
| `/store` | `store.tsx` | Art store — search, category/sort filters, grid/list toggle, detail dialogs |
| `/auctions` | `auctions.tsx` | Auction platform — active/upcoming/ended tabs, bid placement, stats |
| `/artists` | `artists.tsx` | Artist directory — search, featured cards, detail dialogs |
| `/artists/:id` | `artist-profile.tsx` | Artist profile — 3D maze gallery, portfolio, blog tabs |
| `/dashboard` | `artist-dashboard.tsx` | Artist management — artworks CRUD, blog, orders, profile settings |
| `/blog` | `blog.tsx` | Blog listing page |
| `/blog/:id` | `blog-post.tsx` | Individual blog post |
| `/auth` | `auth-page.tsx` | Login/signup (email + password, Google OIDC) |
| `/auth/set-password` | `set-password-page.tsx` | Set password after magic link verification |
| `*` | `not-found.tsx` | 404 page |

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

## 5. 3D Gallery System

Two Three.js WebGL components power the virtual museum experience.

### HallwayGallery3D (`components/hallway-gallery-3d.tsx`)

The main museum entrance. A long hallway with doorways branching off to individual artist rooms.

- First-person controls: WASD movement, mouse look
- Per-artist labeled rooms with exhibition artworks on walls
- Mesh-based collision detection
- Smooth room entry/exit transitions
- Ambient + directional lighting
- Texture caching with Promise-based loading
- Constants: cell size 2.5u, wall thickness 0.15u, player height 1.5u, move speed 0.08u/frame

### MazeGallery3D (`components/maze-gallery-3d.tsx`)

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

## 6. State Management

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

## 7. Authentication

Implemented in `server/replit_integrations/auth/`.

### Google OIDC
- **Protocol:** OIDC (OpenID Connect) via `openid-client` v6
- **Default provider:** Google (`accounts.google.com`)
- **Strategy:** Passport.js with `ClientSecretPost` authentication
- **Auto-provisioning:** On first login, a user record is upserted and an artist profile is auto-created
- **Host validation:** Optional `OIDC_ALLOWED_HOSTS` whitelist (comma-separated)

### Email/Password (Local Auth)
- **Signup:** Email → magic link (Resend) → verify → set password
- **Login:** Email + password via Passport local strategy (bcryptjs)
- **Password storage:** bcrypt hash (12 rounds), null for OIDC-only users
- **Magic links:** Single-use tokens, 1-hour expiry, stored in `magic_links` table

### Sessions
- PostgreSQL-backed via `connect-pg-simple`, 7-day TTL
- HttpOnly/Secure/SameSite=Lax cookies
- User lookup by stable email key with upsert-on-conflict

---

## 8. MCP Server

Endpoint: `POST/GET/DELETE /mcp` with `mcp-session-id` header. Stateful per-session instances using Streamable HTTP transport. **All routes require authentication** via `isAuthenticated` middleware (P0 fix — 2026-03-13).

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

## 8b. Security Hardening (2026-03-13)

The following security measures were implemented as part of the security audit (issue #77):

### HTTP Security Headers (Helmet)
Express uses `helmet` middleware to set security headers in production:
- `Content-Security-Policy` — restricts script sources (disabled in dev for Vite HMR inline scripts)
- `Strict-Transport-Security` (HSTS) — enforces HTTPS
- `X-Frame-Options` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy` — limits referrer information

### Endpoint Authorization
All write endpoints (POST/PATCH/DELETE) for artworks, blog posts, and artist profiles enforce **ownership authorization** — the authenticated user must own the artist profile associated with the resource. Cross-artist mutations return `403 Forbidden`.

Order endpoints (`GET /api/orders`, `GET /api/artists/:id/orders`) are scoped to the authenticated user's own artist profile, preventing PII exposure (buyer names, emails, addresses).

### Input Validation
All PATCH endpoints validate request bodies against Zod partial schemas (`updateArtworkSchema`, `updateBlogPostSchema`, `updateArtistSchema`) before passing data to the database layer. Invalid fields are rejected with `400 Bad Request`.

### SSRF Protection
The image proxy (`GET /api/image-proxy`) blocks requests to private/internal IP ranges (RFC 1918, loopback, link-local, cloud metadata endpoints). Redirect targets are also validated.

### File Upload Hardening
Uploaded files are validated via magic byte inspection (file signature matching) in addition to MIME type filtering. Mismatched files are rejected.

### Email Template Security
All user-supplied values in email templates (order notifications) are HTML-escaped to prevent injection of malicious HTML/scripts into emails.

---

## 9. UI Framework & Design System

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

## 10. Build & Deployment

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
- **ci.yml:** Lint → type check → tests → build → Docker image → staging deploy (on main push)
- **deploy-production.yml:** Manual production deploy with rollback state tracking
- **rollback-production.yml:** One-click rollback to previous version

---

## 11. Testing

Framework: Vitest. Tests in `server/__tests__/`.

### Test Structure
- **storage.test.ts** — Unit tests: gallery layout generation algorithm, mocked DatabaseStorage methods, cascading delete verification
- **routes.test.ts** — Integration tests: HTTP endpoint validation with supertest, input validation (Zod), auction bid rules, order state machine enforcement, gallery regeneration triggers
- **helpers/test-app.ts** — Test fixture: mocked storage + auth, Express app factory
- **helpers/mock-storage.ts** — Full IStorage mock (`vi.fn()` stubs)

### Running Tests
```bash
npm test                    # All tests
npm run test:watch          # Watch mode
npx vitest run <file>       # Single file
```

---

## 12. Environment Variables

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
| `RESEND_API_KEY` | No | — | Resend API key for email (magic links, order notifications) |
| `RESEND_FROM_EMAIL` | No | `ArtVerse <onboarding@resend.dev>` | Sender address for emails |

---

## 13. Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| React | 18.3 | UI framework |
| Express | 5.0 | HTTP server |
| Drizzle ORM | 0.39 | Database ORM (dual-mode: push for staging, migrations for production) |
| PostgreSQL (pg) | 8.16 | Database driver |
| Three.js | 0.182 | 3D WebGL rendering |
| Vite | 7.3 | Frontend build tool + dev server |
| TanStack Query | 5.60 | Server state management |
| Zustand | 5.0 | Client state management |
| Wouter | 3.3 | Client-side routing |
| Passport | 0.7 | Authentication middleware |
| openid-client | 6.8 | OIDC protocol |
| bcryptjs | 3.0 | Password hashing |
| Resend | 4.0 | Transactional email |
| Zod | 3.24 | Schema validation |
| @modelcontextprotocol/sdk | 1.26 | MCP server |
| esbuild | 0.25 | Server bundler |
| Vitest | 3.2 | Test framework |
| TypeScript | 5.6 | Type system |

---

## 14. Seed Data

When `SEED_DB=true`, the application seeds:
- **1 artist:** Alexandra C. (Romanian/Dutch reverse glass painter)
- **18 artworks:** Reverse glass paintings + oil paintings (mix of for-sale and sold)
- **1 blog post:** "Opening the Studio Door" (published)
- **1 exhibition:** "Grand Opening Exhibition" (active, with wall placements)
- **Pre-generated gallery layout:** 7x7 white room with artworks on perimeter walls
