# Admin Workflow

**Status:** Active
**Last Updated:** 2026-05-19
**Owner:** Architecture

An admin is an authenticated user with `role=admin`. Admins have platform-wide control: manage users and roles, moderate content, configure site-wide settings, and inspect logs. There is no self-service signup for admins — roles are assigned by another admin.

## Journey

```mermaid
flowchart TD
    A[Sign in as admin] --> B[Admin panel /admin]
    B --> C{What to do?}

    C -->|Users| D[List all users]
    D --> D1[Assign role:<br/>user / curator / admin]
    D --> D2[Delete user →<br/>cascades to<br/>artist profile]

    C -->|Artworks| E[Browse all artworks<br/>across artists]
    E --> E1[Delete inappropriate<br/>artwork]

    C -->|Blog| F[List all blog posts]
    F --> F1[Delete posts]

    C -->|Exhibitions| G[List exhibitions<br/>API only — no UI]
    G --> G1[Delete<br/>creation via MCP]

    C -->|Settings| H[Site settings]
    H --> H1[Default gallery<br/>template:<br/>contemporary,<br/>minimalist, etc.]

    C -->|Logs| I[Structured log viewer]
    I --> I1[Filter by level,<br/>module, time<br/>full-text search]

    C -->|Newsletter| J[Subscriber list]
    J --> J1[Unsubscribe users]
```

## Key entry points

- Admin page: `client/src/pages/admin.tsx`
- Routes: `server/routes.ts` — `/api/admin/*` guarded by `isAdmin` middleware
- User role updates: cascade nothing beyond the role column; user-deletion cascades to the artist profile
- Logs: streaming view backed by the structured logger (`server/index.ts` integration)
- MCP exhibition creation: `server/mcp.ts` exposes exhibition tools (admin path)

## Authorization

- Only `isAdmin` is permitted on `/api/admin/*` and the `/admin` UI route.
- Admins are **not** automatically artists. To upload artwork as an admin, a separate artist profile would be required — but the platform treats admin actions as moderation, not authoring.
- There is no audit log of admin actions today; structured logs capture the requests but not a curated history. Consider an ADR if this becomes a compliance requirement.
