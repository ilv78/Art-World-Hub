# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Work Workflow

Every piece of work MUST follow this sequence — no exceptions, even for "small" fixes or doc updates:

1. **Check for a GitHub issue.** If none exists, propose creating one (with suggested priority and labels) and wait for approval before proceeding.
2. **Post a plan as a comment on the issue.** Describe what will change, which files, and why.
3. **Wait for the developer to approve the plan.** Do not start modifying files until explicitly told to proceed.
4. **Work the issue.** Update the issue with progress as needed.
5. **Tag with `release: next`** when done.

## Project Overview

ArtVerse — a full-stack art gallery platform with a 3D virtual museum, marketplace, auction system, and artist dashboards. Monolithic architecture with React frontend, Express backend, and PostgreSQL.

## Postmortem Workflow

When the developer says any of the following, follow the workflow defined in
`docs/postmortems/POSTMORTEM_WORKFLOW.md`:

- `"run a postmortem on [incident/event]"`
- `"write a postmortem for [description]"`
- `"postmortem: [description]"`
- `"conduct a postmortem"`

Key constraints:
- Always blameless — no individual names in failure sections
- Always create the file at `docs/postmortems/YYYY-MM-DD-<slug>.md`
- Always produce at least one P0 or P1 action item
- Always investigate "what changed last" before any other root cause analysis
- Security incidents use restricted distribution — do not commit until confirmed safe
- Run the self-review checklist before presenting the draft

## Decision Log

When work involves an architectural or infrastructure decision (technology choice, security change, process change, major feature design, deployment/CI change), add a row to `specs/decisions/DECISION-LOG.md` as part of the same PR. One-line format:

```
| YYYY-MM-DD | Decision summary (#issue) | Context/reason | Architecture |
```

This applies during normal work — do not batch decisions for later.

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

PostgreSQL 16 with Drizzle ORM. Schema defined in `shared/schema.ts` + `shared/models/auth.ts`. Tables: `users`, `sessions`, `magic_links`, `artists`, `artworks`, `auctions`, `bids`, `orders`, `exhibitions`, `exhibition_artworks`, `blog_posts`. Dual-mode: staging uses `drizzle-kit push`, production uses versioned migrations from `migrations/`. See `specs/architecture/DATA-MODEL.md` for full schema docs.

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

- `.github/workflows/ci.yml` — lint → type check → tests → build → Docker image → staging deploy (on main push)
- `.github/workflows/deploy-production.yml` — manual production deploy with rollback state tracking
- `.github/workflows/rollback-production.yml` — one-click rollback to previous version

### Order Status Flow

`pending → communicating → sending → closed` (any non-canceled status can transition to `canceled`)

## Environment Variables

Required: `DATABASE_URL`, `SESSION_SECRET`. Optional: `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. See `.env.example`.

## Documentation Culture

All documentation lives in `specs/`. Before starting any task:
1. Read `specs/DOC-AGENT-SPEC.md` to understand what must be documented.
2. If adding a new feature → create or update `specs/features/<name>/SPEC.md`.
3. If changing the database schema → update `specs/architecture/DATA-MODEL.md`.
4. If making an architectural decision → create `specs/architecture/ADR/ADR-XXXX.md`.

The Documentation Agent enforces these rules on every PR.
Undocumented changes will block merge.
