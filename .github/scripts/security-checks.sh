#!/usr/bin/env bash
# .github/scripts/security-checks.sh
#
# ArtVerse — Custom Security Checks
# Runs fast, targeted assertions specific to this stack.
# Each check prints a clear pass/fail and sets EXIT_CODE.
# The script exits non-zero if any check fails.

set -euo pipefail

EXIT_CODE=0
PASS="[PASS]"
FAIL="[FAIL]"
WARN="[WARN]"

# ArtVerse source directories
SERVER_DIR="server/"
CLIENT_DIR="client/src/"
SCHEMA_DIR="shared/"

# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────
fail() {
  echo "$FAIL  $1"
  EXIT_CODE=1
}

pass() {
  echo "$PASS  $1"
}

warn() {
  echo "$WARN  $1"
}

section() {
  echo ""
  echo "── $1 ──────────────────────────────────────"
}

# ─────────────────────────────────────────────
# CHECK 1 — .env is gitignored
# ─────────────────────────────────────────────
section "Secret Hygiene"

if git ls-files --error-unmatch .env &>/dev/null 2>&1; then
  fail ".env is tracked by Git — remove it immediately with: git rm --cached .env"
else
  pass ".env is not tracked by Git"
fi

if grep -qE '^\.env$' .gitignore 2>/dev/null; then
  pass ".env is listed in .gitignore"
else
  fail ".env is NOT in .gitignore — add it"
fi

if [ -f ".env.example" ]; then
  pass ".env.example exists"
else
  fail ".env.example is missing — developers need it to onboard"
fi

# ─────────────────────────────────────────────
# CHECK 2 — Helmet middleware
# Express apps must use helmet for security headers.
# ─────────────────────────────────────────────
section "HTTP Security Headers (helmet)"

if grep -rq "helmet" "$SERVER_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
  pass "helmet is referenced in server source code"
else
  fail "helmet not found in server source — add: app.use(helmet())"
fi

if grep -q '"helmet"' package.json 2>/dev/null; then
  pass "helmet is in package.json dependencies"
else
  fail "helmet is not in package.json — run: npm install helmet"
fi

# ─────────────────────────────────────────────
# CHECK 3 — Rate limiting on auth routes
# express-rate-limit must be present and applied
# to authentication-related routes.
# ─────────────────────────────────────────────
section "Rate Limiting"

if grep -q "express-rate-limit" package.json 2>/dev/null; then
  pass "express-rate-limit is in package.json"
else
  fail "express-rate-limit not found — run: npm install express-rate-limit"
fi

if grep -rq "rateLimit\|rateLimiter\|express-rate-limit" "$SERVER_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
  pass "Rate limiter is referenced in server source code"
else
  fail "No rate limiter usage found in server — auth routes are unprotected"
fi

# ─────────────────────────────────────────────
# CHECK 4 — CORS is not wildcard on non-public routes
# origin: '*' is acceptable for public APIs only.
# ─────────────────────────────────────────────
section "CORS Configuration"

if grep -rq "origin.*['\"\`]\*['\"\`]" "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
  warn "Wildcard CORS origin ('*') detected — verify this is intentional for public-only routes"
  warn "File(s):"
  grep -rn "origin.*['\"\`]\*['\"\`]" "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true
else
  pass "No wildcard CORS origin detected"
fi

# ─────────────────────────────────────────────
# CHECK 5 — JWT secret is not hardcoded
# ─────────────────────────────────────────────
section "JWT Secret Hygiene"

if grep -rqE "jwt\.sign|jsonwebtoken" "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
  if grep -rqE "jwt\.sign\([^)]*['\"][A-Za-z0-9+/]{20,}['\"]" "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
    fail "Potential hardcoded JWT secret detected in jwt.sign() call — use process.env.JWT_SECRET"
  else
    pass "No hardcoded JWT secret detected in jwt.sign() calls"
  fi

  if grep -rqE "process\.env\.JWT_SECRET|env\.JWT_SECRET" "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
    pass "JWT_SECRET is sourced from environment variables"
  else
    fail "JWT_SECRET not found in env references — ensure it's not hardcoded"
  fi
else
  pass "JWT not used (Passport.js session-based auth instead)"
fi

# ─────────────────────────────────────────────
# CHECK 6 — DATABASE_URL is not hardcoded
# ─────────────────────────────────────────────
section "Database Secret Hygiene"

if grep -rqE "postgres://[^\$\{].*:[^\$\{].*@" "$SERVER_DIR" "$SCHEMA_DIR" --include="*.ts" --include="*.js" 2>/dev/null; then
  fail "Potential hardcoded DATABASE_URL detected — use process.env.DATABASE_URL"
  grep -rnE "postgres://[^\$\{].*:[^\$\{].*@" "$SERVER_DIR" "$SCHEMA_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true
else
  pass "No hardcoded DATABASE_URL detected"
fi

# ─────────────────────────────────────────────
# CHECK 7 — Dockerfile runs as non-root
# ─────────────────────────────────────────────
section "Docker Security"

if [ -f "Dockerfile" ]; then
  if grep -q "^USER " Dockerfile; then
    USER_LINE=$(grep "^USER " Dockerfile | tail -1)
    if echo "$USER_LINE" | grep -qiE "USER root"; then
      fail "Dockerfile sets USER root — use a non-root user"
    else
      pass "Dockerfile sets a non-root USER: $USER_LINE"
    fi
  else
    fail "Dockerfile has no USER directive — container runs as root by default"
  fi

  # Check for .env in COPY commands
  if grep -qE "^COPY \. \." Dockerfile 2>/dev/null; then
    if [ -f ".dockerignore" ] && grep -qE "^\.env" .dockerignore; then
      pass ".env is excluded via .dockerignore"
    else
      fail "Dockerfile uses COPY . . but .env is not in .dockerignore — secrets may be baked into image"
    fi
  fi
else
  warn "No Dockerfile found — skip Docker checks"
fi

# ─────────────────────────────────────────────
# CHECK 8 — Open security TODOs in source code
# Flag any TODO/FIXME/HACK comments mentioning
# security keywords so they don't get forgotten.
# ─────────────────────────────────────────────
section "Open Security TODOs"

SECURITY_TODOS=$(grep -rnE "(TODO|FIXME|HACK|XXX).*(auth|secret|password|token|security|unsafe|vulnerable|inject|sanitize|validate)" \
  "$SERVER_DIR" "$CLIENT_DIR" --include="*.ts" --include="*.js" 2>/dev/null || true)

if [ -n "$SECURITY_TODOS" ]; then
  warn "Open security TODOs found — review before merging to main:"
  echo "$SECURITY_TODOS"
else
  pass "No open security TODOs found"
fi

# ─────────────────────────────────────────────
# RESULT
# ─────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────"
if [ $EXIT_CODE -ne 0 ]; then
  echo "$FAIL  Security checks FAILED — see findings above"
else
  echo "$PASS  All ArtVerse security checks passed"
fi
echo "────────────────────────────────────────────"

exit $EXIT_CODE
