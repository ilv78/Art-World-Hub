# ArtVerse — Decision Log

**Status:** Active
**Last Updated:** 2026-03-13

Lightweight log for minor decisions that don't warrant a full ADR. For significant architectural decisions, create an ADR in `specs/architecture/ADR/`.

---

| Date | Decision | Context | Made By |
|------|----------|---------|---------|
| 2026-03-10 | Merge CI and deploy into single workflow (ci.yml) | Option A chosen over separate workflows — simpler to reason about | Architecture |
| 2026-03-10 | Skip branch protection (Step 4) | Requires GitHub Pro or public repo — revisit when repo goes public | Architecture |
| 2026-03-10 | Use single VPS for both staging and production | Separate Linux users on Webdock VPS, simpler than multi-server | Architecture |
| 2026-03-10 | Staging uses push mode, production uses migrations | Push mode is fast for disposable staging data; migrations are safe for production | Architecture |
| 2026-03-11 | Use Telegram for deploy notifications | Lightweight, personal — no Slack/Teams overhead for solo dev | Architecture |
| 2026-03-11 | Save rollback state as `.previous_image_tag` file | Simple file-based approach vs database/API — works with SSH emergency rollback | Architecture |
| 2026-03-12 | Add email/password auth alongside Google OIDC | Users without Google accounts need access; magic link signup ensures email ownership | Architecture |
| 2026-03-12 | Use Resend for transactional email | Simple API, good free tier, handles deliverability — replaced dead Replit connector | Architecture |
| 2026-03-12 | Restructure specs/ into taxonomy | Per DOC-AGENT-SPEC.md — enables automated documentation validation | Architecture |
| 2026-03-12 | Doc agent: Claude for PRs, shell script for audits | claude-code-action API doesn't support scheduled/push triggers well; shell script is reliable and free for structural checks | Architecture |
| 2026-03-13 | Pin all GitHub Actions to commit SHAs | Mutable tags (@v3, @v6) can be moved to malicious code — SHA pinning prevents supply chain attacks on CI/CD | Architecture |
| 2026-03-13 | Move `${{ }}` interpolation to `env:` blocks in workflows | Direct `${{ }}` in `run:` steps is vulnerable to shell injection if attacker controls the value (PR title, dispatch input) | Architecture |
| 2026-03-13 | Add ownership authorization to all write endpoints | Auth alone isn't enough — artist A could modify artist B's data. Ownership checks enforce resource-level access control | Architecture |
| 2026-03-13 | Add auth to MCP server endpoint | MCP exposed full CRUD with zero authentication — any HTTP client could manipulate all data | Architecture |
| 2026-03-13 | Block private IPs in image proxy (SSRF) | Image proxy could be used to scan internal network or access cloud metadata (169.254.169.254) | Architecture |
| 2026-03-13 | Validate file uploads via magic bytes, not just MIME header | Client-supplied MIME type is trivially spoofed — magic byte inspection verifies actual file content | Architecture |
| 2026-03-13 | HTML-escape user values in email templates | Unescaped user input (buyer name, address) could inject malicious HTML/phishing into notification emails | Architecture |
| 2026-03-13 | Use `DB_MIGRATION_MODE=migrate` in production | Push mode can destructively alter schema without review; migration mode requires explicit versioned SQL files committed to git | Architecture |
