# MCP Server — Changelog

## 2026-02 (Initial)
- MCP endpoint at `POST/GET/DELETE /mcp`
- Streamable HTTP transport with stateful per-session instances
- 13 resources for querying all major entities
- 12 tools for CRUD operations on artworks, blog, orders, bids, profiles, gallery
- 4 prompt templates for AI-assisted content generation
- Zod schema validation on all tool inputs
- `@ts-expect-error` workarounds for MCP SDK deep type instantiation issues
