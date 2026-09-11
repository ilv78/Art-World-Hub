# MCP Server — Changelog

## 2026-09-11 — Audit trail (#738)
- **Security:** every tool / resource / prompt invocation now logs caller identity, session, target id and outcome through `mcpLogger`. Before this, `/mcp` recorded nothing at all — `pino-http` skipped any URL not starting with `/api`, and `server/mcp.ts` logged only errors, without identity. The #732 review had to answer "was the pre-#695 gap ever exercised?" by structural inference, because no log could answer it.
- **Identifiers only, never argument values** — `get_logs` and `/api/admin/logs` surface `app.log` to admins, so logged values are readable back through the app.
- Instrumentation in `server/mcp-audit.ts`, installed by patching the registration methods, so handlers added later are audited by construction.
- All refusal paths route through `recordDenial()`, including the two that shape their own refusal (`orders-by-artist` resource, `order_summary` prompt) — denials log at `warn` with the reason.
- `pino-http` `autoLogging` extended to `/mcp`, so requests rejected before dispatch still leave a trace.
- `createMcpServer(userId, session?)` signature change: the session id does not exist when the server is constructed, so it arrives via a holder populated in `onsessioninitialized`.
- New tests: `server/__tests__/mcp-audit.test.ts` (allowed call, tool/resource/prompt denials, no-argument-values sentinel, pre-initialisation session).

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
