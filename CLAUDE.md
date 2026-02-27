# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArtVerse — a full-stack art gallery platform with a 3D virtual museum, marketplace, auction system, and artist dashboards. Monolithic architecture with React frontend, Express backend, and PostgreSQL.

## Commands

```bash
npm run dev          # Start dev server (tsx, hot reload, port 5000)
npm run build        # Production build (Vite client → dist/public/, esbuild server → dist/index.cjs)
npm run start        # Run production build
npm run check        # TypeScript type checking (tsc)
npm run db:push      # Push Drizzle schema changes to database
```

**Docker (local):** `docker compose up` — starts PostgreSQL (port 5433) + app (port 5000). Requires `.env` file (see `.env.example`).

**Testing (Vitest):**

```bash
npm test                                          # Run all tests
npm run test:watch                                # Watch mode
npx vitest run server/__tests__/storage.test.ts   # Single file
npx vitest --reporter=verbose                     # Detailed output
```

Tests live in `server/__tests__/`. Storage tests mock `server/db.ts`; route tests mock the `storage` module and auth, using supertest for HTTP assertions.

## Architecture

### Monorepo Layout

- **`client/`** — React 18 + Vite frontend. Pages in `client/src/pages/`, components in `client/src/components/`.
- **`server/`** — Express 5 backend. `routes.ts` (API handlers), `storage.ts` (DB layer), `mcp.ts` (MCP server).
- **`shared/`** — `schema.ts` is the single source of truth for DB schema (Drizzle ORM) and Zod validation types. Both client and server import from here.

### Path Aliases (tsconfig + vite)

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

### Database

PostgreSQL 16 with Drizzle ORM. Schema defined in `shared/schema.ts`. Tables: `users`, `sessions`, `artists`, `artworks`, `auctions`, `bids`, `orders`, `exhibitions`, `exhibition_artworks`, `blog_posts`. Run `npm run db:push` after schema changes (no migration files, uses push mode).

### Server Data Layer

`server/storage.ts` contains `DatabaseStorage` class implementing `IStorage` interface. All DB access goes through this class — route handlers and MCP tools both use the shared `storage` singleton.

### Authentication

Passport.js with OIDC (Google by default) + local email/password. Lives in `server/replit_integrations/auth/`. Sessions stored in PostgreSQL via `connect-pg-simple`. On first login, a user record + artist profile are auto-created. Protected routes use `isAuthenticated` middleware.

### Frontend State

- **Server state**: TanStack Query (React Query) — configured in `client/src/lib/queryClient.ts`
- **Client state**: Zustand cart store in `client/src/lib/cart-store.ts` (persisted to localStorage)
- **Routing**: Wouter (lightweight, `<Route path="...">` pattern)

### 3D Gallery

Three.js WebGL rendering in two components:
- `hallway-gallery-3d.tsx` — museum hallway with per-artist rooms (main gallery page)
- `maze-gallery-3d.tsx` — individual artist exhibition rooms (artist profile page)

Gallery layouts are auto-generated server-side and stored as JSONB on the `artists.galleryLayout` column. Regenerated when `isReadyForExhibition` changes on artworks.

### MCP Server

`server/mcp.ts` exposes a Model Context Protocol endpoint at `POST/GET/DELETE /mcp` with 14 resources, 12 tools, and 4 prompt templates. Uses stateful per-session instances over Streamable HTTP transport.

### UI Framework

Shadcn UI (Radix primitives) + Tailwind CSS. Component source in `client/src/components/ui/`. Config in `components.json`. Design tokens: primary orange (#F97316), Playfair Display serif + Inter sans-serif.

### Build Process

`script/build.ts` orchestrates production builds: Vite bundles the client to `dist/public/`, esbuild bundles the server to `dist/index.cjs` (CJS format, with selective dependency bundling via an allowlist).

### CI/CD

- `.github/workflows/ci.yml` — type check + build on push/PR (uses PostgreSQL 16 service container)
- `.github/workflows/deploy.yml` — Docker image build + push to GHCR on push to main

### Order Status Flow

`pending → communicating → sending → closed` (any non-canceled status can transition to `canceled`)

## Environment Variables

Required: `DATABASE_URL`, `SESSION_SECRET`. Optional: `SEED_DB=true` (seeds sample data), `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. See `.env.example`.
