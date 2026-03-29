# Vernis9

A full-stack art gallery platform featuring a 3D virtual museum, marketplace, auction system, and artist dashboards.

**Live:** [vernis9.art](https://vernis9.art) | **Staging:** [staging.vernis9.art](https://staging.vernis9.art)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Shadcn UI |
| 3D Gallery | Three.js (WebGL) |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | Passport.js + Google OIDC |
| State | TanStack Query (server), Zustand (client) |
| Routing | Wouter |
| Testing | Vitest, Supertest |
| CI/CD | GitHub Actions, Docker, GHCR |
| AI Integration | Model Context Protocol (MCP) server |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local PostgreSQL)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/ilv78/Art-World-Hub.git
   cd Art-World-Hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Start the database and app with Docker:
   ```bash
   docker compose up
   ```
   This starts PostgreSQL (port 5433) and the app (port 5000).

   **Or** run the app directly (requires a running PostgreSQL instance):
   ```bash
   # Set DATABASE_URL and SESSION_SECRET in your environment
   npm run dev
   ```

5. Open [http://localhost:5000](http://localhost:5000)

### Seeding Sample Data

Set `SEED_DB=true` in your `.env` file to populate the database with sample artists, artworks, and blog posts on first startup.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload (port 5000) |
| `npm run build` | Production build (Vite + esbuild) |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run check` | TypeScript type checking |
| `npm test` | Run all tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run db:push` | Push Drizzle schema changes to database |
| `npm run db:migrate` | Run Drizzle migrations |

## Project Structure

```
Art-World-Hub/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # UI components (Shadcn + custom)
│       ├── pages/           # Route pages
│       ├── hooks/           # Custom React hooks
│       └── lib/             # Utilities, query client, cart store
├── server/                  # Express backend
│   ├── routes.ts            # API route handlers
│   ├── storage.ts           # Database access layer (IStorage)
│   ├── mcp.ts               # MCP server (14 resources, 12 tools)
│   ├── __tests__/           # Vitest tests
│   └── replit_integrations/
│       └── auth/            # Authentication (OIDC + sessions)
├── shared/
│   └── schema.ts            # Drizzle schema + Zod types (single source of truth)
├── deploy/                  # Docker Compose files, nginx configs, setup scripts
├── migrations/              # Drizzle SQL migrations
├── specs/                   # Project specifications and procedures
└── docker-compose.yml       # Local development stack
```

## Features

- **3D Virtual Museum** — WebGL-powered gallery with hallway navigation and per-artist exhibition rooms
- **Artist Dashboard** — Profile management, artwork uploads, blog posts, order tracking
- **Marketplace** — Browse and purchase artworks with shopping cart
- **Auction System** — Time-based bidding on artworks
- **Exhibitions** — Curated artwork collections
- **Image Uploads** — Server-side file storage with multer (JPEG, PNG, WebP, GIF; 10MB max)
- **MCP Server** — AI-friendly API via Model Context Protocol
- **Google OAuth** — One-click login with automatic artist profile creation

## Architecture

### Database

PostgreSQL 16 with Drizzle ORM. Schema defined in `shared/schema.ts`. Tables: `users`, `sessions`, `artists`, `artworks`, `auctions`, `bids`, `orders`, `exhibitions`, `exhibition_artworks`, `blog_posts`.

### Authentication

Passport.js with OpenID Connect (Google by default). Sessions stored in PostgreSQL via `connect-pg-simple`. On first login, a user record and artist profile are auto-created. Protected API routes use the `isAuthenticated` middleware.

### 3D Gallery

Two Three.js components render the virtual museum:
- **Hallway Gallery** — museum corridor with doors to per-artist rooms
- **Maze Gallery** — individual artist exhibition spaces

Gallery layouts are auto-generated server-side and stored as JSONB on each artist record.

## CI/CD

The pipeline runs on GitHub Actions:

1. **On every push/PR:** lint, type check, test, build
2. **On merge to main:** Docker image build + push to GHCR, auto-deploy to staging
3. **Production:** manual deploy via `gh workflow run deploy-production.yml`
4. **Rollback:** one-click rollback via `gh workflow run rollback-production.yml`

Telegram notifications are sent for every deploy and rollback.

See [`specs/cicd-pipeline.md`](specs/cicd-pipeline.md) for detailed pipeline diagrams.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for session encryption |
| `SEED_DB` | No | Set to `true` to seed sample data |
| `OIDC_ISSUER_URL` | No | OIDC provider URL (default: Google) |
| `OIDC_CLIENT_ID` | No | OAuth client ID |
| `OIDC_CLIENT_SECRET` | No | OAuth client secret |

See [`.env.example`](.env.example) for a template.

## License

MIT
