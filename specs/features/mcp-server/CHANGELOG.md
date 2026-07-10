# MCP Server — Changelog

## 2026-07-10 — Per-tool authorization (#681)
- **Security (critical):** MCP sessions are now bound to the initializing user; tools, resources, and prompts enforce the same ownership/admin checks as the REST API. Previously any logged-in user could mutate any artist's data, read buyer PII, and dump application logs through MCP.
- `createMcpServer(userId)` signature change; sessions map stores `userId`; cross-user reuse of an `mcp-session-id` returns `403`.
- `get_logs` is now admin-only (parity with `/api/admin/logs`).
- New tests: `server/__tests__/mcp-auth.test.ts` (cross-tenant denial, owner/admin allow paths, session binding).

## 2026-02 (Initial)
- MCP endpoint at `POST/GET/DELETE /mcp`
- Streamable HTTP transport with stateful per-session instances
- 13 resources for querying all major entities
- 12 tools for CRUD operations on artworks, blog, orders, bids, profiles, gallery
- 4 prompt templates for AI-assisted content generation
- Zod schema validation on all tool inputs
- `@ts-expect-error` workarounds for MCP SDK deep type instantiation issues
