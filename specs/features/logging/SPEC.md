# Logging Infrastructure

**Status:** Active
**Issue:** [#39](https://github.com/ilv78/Art-World-Hub/issues/39)
**PRs:** [#124](https://github.com/ilv78/Art-World-Hub/pull/124), [#125](https://github.com/ilv78/Art-World-Hub/pull/125), [#126](https://github.com/ilv78/Art-World-Hub/pull/126)
**Last Updated:** 2026-03-15

---

## Overview

Structured JSON logging using [pino](https://github.com/pinojs/pino), replacing all `console.log/error/warn` calls. Logs are written to both stdout (for Docker) and a persistent file (for querying via admin API and MCP).

---

## Architecture

### Logger Module (`server/logger.ts`)

```
                    pino (root logger)
                    ├── stdout (JSON in production, pretty in dev)
                    └── /app/logs/app.log (JSON, persistent via Docker volume)
                         │
               ┌─────────┼──────────┐
               ▼         ▼          ▼
          authLogger  mcpLogger  seedLogger
          (child)     (child)    (child)
```

- **Root logger** — `pino` with ISO timestamps and `pino.multistream` for dual output
- **Child loggers** — each adds a `module` field (e.g., `"module": "auth"`) for filtering
- **pino-http middleware** — automatic request/response logging on `/api/*` routes with method, URL, status code, and response time
- **No worker threads** — uses `pino.multistream()` (not `pino.transport()`) for esbuild bundle compatibility

### Log Entry Format (NDJSON)

Each line in the log file is a standalone JSON object:

```json
{"level":30,"time":"2026-03-15T20:08:17.270Z","pid":1,"hostname":"ee44cff1c89a","module":"mcp","msg":"MCP server registered at /mcp"}
{"level":30,"time":"2026-03-15T20:08:39.323Z","pid":1,"hostname":"ee44cff1c89a","req":{"method":"GET","url":"/api/artists"},"res":{"statusCode":200},"responseTime":7,"msg":"request completed"}
{"level":50,"time":"2026-03-15T21:00:00.000Z","pid":1,"hostname":"ee44cff1c89a","module":"auth","err":{"message":"bad password","type":"Error"},"msg":"Login failed"}
```

### Pino Log Levels

| Level | Value | Usage |
|-------|-------|-------|
| `fatal` | 60 | Process-ending errors |
| `error` | 50 | Operation failures (auth, email, DB) |
| `warn` | 40 | Degraded state (Resend not configured, OIDC disabled) |
| `info` | 30 | Normal operations (startup, requests, seeding) |
| `debug` | 20 | Detailed diagnostics (off by default) |
| `trace` | 10 | Very verbose (off by default) |

---

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) |
| `LOG_DIR` | `./logs` | Directory for log files |

---

## Access Methods

### 1. Admin API — `GET /api/admin/logs`

Requires admin role (RBAC). Returns filtered log entries from the log file.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `limit` | number | Max entries to return (default 200, max 2000) |
| `level` | string | Minimum level: `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `module` | string | Filter by module: `auth`, `mcp`, `seed` |
| `search` | string | Case-insensitive text search across log lines |
| `since` | string | ISO timestamp — only entries after this time |

**Response:**
```json
{
  "entries": [ { "level": 50, "time": "...", "msg": "..." }, ... ],
  "total": 42
}
```

**Examples:**
- `/api/admin/logs` — last 200 entries
- `/api/admin/logs?level=error` — errors and fatals only
- `/api/admin/logs?module=auth&since=2026-03-15T10:00:00Z` — auth entries since 10am
- `/api/admin/logs?search=artists&limit=10` — entries mentioning "artists"

### 2. MCP Tool — `get_logs`

Same filtering capabilities as the admin API, accessible to Claude via the MCP server.

**Parameters:** `limit`, `level`, `module`, `search`, `since` (same as API above).

### 3. SSH (direct file access)

```bash
# View last 20 entries (pretty-printed)
ssh staging@artverse.idata.ro "cd ~/app && docker compose exec -T app tail -20 /app/logs/app.log" | python3 -m json.tool

# Docker stdout logs
ssh staging@artverse.idata.ro "cd ~/app && docker compose logs --tail=20 app"
```

### 4. Local development

Logs are pretty-printed to stdout via `pino-pretty` (devDependency) and written as JSON to `logs/app.log`.

```bash
# View log file
cat logs/app.log | npx pino-pretty

# Filter errors
grep '"level":50' logs/app.log | npx pino-pretty
```

---

## Docker Setup

### Volumes

All three docker-compose files (`docker-compose.yml`, `deploy/staging/docker-compose.yml`, `deploy/production/docker-compose.yml`) mount a `logs` volume:

```yaml
volumes:
  - logs:/app/logs
```

### Directory creation

The Dockerfile creates `/app/logs` during build. Deploy workflows also ensure the directory exists and has correct ownership:

```bash
mkdir -p /app/logs && chown -R appuser:appgroup /app/logs
```

---

## Testing

### Unit Tests (`server/__tests__/logger.test.ts`)

5 tests verifying pino output format:

| Test | What it verifies |
|------|-----------------|
| NDJSON output | Log file contains valid JSON lines |
| ISO timestamp | `time` field is ISO 8601 format |
| Child module field | Child logger adds `module` field |
| Error serialization | `err` includes `message` and `type` |
| Structured context | Extra fields (port, host) are included |

### Admin Logs Endpoint Tests (`server/__tests__/routes.test.ts`)

8 tests covering the `GET /api/admin/logs` endpoint:

| Test | What it verifies |
|------|-----------------|
| Default params | Returns all entries |
| Level filter | Only entries >= specified level |
| Module filter | Only entries with matching module |
| Search filter | Text search across log lines |
| Since filter | Only entries after timestamp |
| Limit | Returns tail of N entries |
| Combined filters | Multiple filters work together |
| Missing file | Returns empty array gracefully |

### Staging Smoke Test (CI/CD)

After every staging deploy, the CI pipeline SSHes into the VPS and verifies:

1. `/app/logs/app.log` exists in the container
2. File has at least 1 entry
3. Last line is valid JSON (parsed with `python3 -c "import json; json.load()"`)
4. File contains `"Server listening"` startup entry

**Location:** `.github/workflows/ci.yml` → `Deploy to Staging` job → `Smoke test — logging infrastructure` step

---

## Files

| File | Purpose |
|------|---------|
| `server/logger.ts` | Pino logger configuration, child loggers, exports |
| `server/index.ts` | pino-http middleware setup |
| `server/routes.ts` | `GET /api/admin/logs` endpoint |
| `server/mcp.ts` | `get_logs` MCP tool |
| `server/__tests__/logger.test.ts` | Logger unit tests |
| `server/__tests__/routes.test.ts` | Admin logs endpoint tests |
| `.github/workflows/ci.yml` | Staging logging smoke test |

---

## Revision Log

| Date | Change |
|------|--------|
| 2026-03-15 | Initial implementation — pino structured logging, admin API, MCP tool, Docker volumes ([#124](https://github.com/ilv78/Art-World-Hub/pull/124)) |
| 2026-03-15 | Fix: switched from `pino.transport()` to `pino.multistream()` for esbuild compatibility ([#125](https://github.com/ilv78/Art-World-Hub/pull/125)) |
| 2026-03-15 | Added unit tests, endpoint tests, and staging smoke test ([#126](https://github.com/ilv78/Art-World-Hub/pull/126)) |
