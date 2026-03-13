#!/bin/bash
#
# ArtVerse — Development Environment Setup
#
# Run this on any machine (local or VPS) to ensure a consistent dev environment.
# Usage: bash script/setup-dev.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
header() { echo -e "\n${YELLOW}$1${NC}"; }

errors=0

# ─── 1. Check required tools ───────────────────────────────────────────────

header "1. Checking required tools"

# Node.js
if command -v node &>/dev/null; then
  node_version=$(node --version)
  node_major=$(echo "$node_version" | sed 's/v\([0-9]*\).*/\1/')
  if [ "$node_major" -ge 20 ]; then
    pass "Node.js $node_version"
  else
    fail "Node.js $node_version (need >= 20)"
    errors=$((errors + 1))
  fi
else
  fail "Node.js not found"
  errors=$((errors + 1))
fi

# npm
if command -v npm &>/dev/null; then
  pass "npm $(npm --version)"
else
  fail "npm not found"
  errors=$((errors + 1))
fi

# Git
if command -v git &>/dev/null; then
  pass "git $(git --version | awk '{print $3}')"
else
  fail "git not found"
  errors=$((errors + 1))
fi

# GitHub CLI
if command -v gh &>/dev/null; then
  if gh auth status &>/dev/null 2>&1; then
    pass "gh CLI $(gh --version | head -1 | awk '{print $3}') (authenticated)"
  else
    warn "gh CLI installed but not authenticated — run: gh auth login"
  fi
else
  warn "gh CLI not found — install for PR workflow: https://cli.github.com"
fi

# Docker
if command -v docker &>/dev/null; then
  pass "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  warn "Docker not found — needed for local Docker dev and production builds"
fi

# ─── 2. Install dependencies ───────────────────────────────────────────────

header "2. Installing dependencies"

npm install 2>&1 | tail -1
pass "npm install complete (Husky prepare hook triggered)"

# ─── 3. Verify Husky hooks ─────────────────────────────────────────────────

header "3. Verifying git hooks"

if [ -f .husky/pre-push ]; then
  if grep -q "refs/heads/main" .husky/pre-push; then
    pass "Pre-push hook installed (blocks direct pushes to main)"
  else
    fail "Pre-push hook exists but doesn't block main pushes"
    errors=$((errors + 1))
  fi
else
  fail "Pre-push hook not found at .husky/pre-push"
  errors=$((errors + 1))
fi

# Verify hook is executable
if [ -x .husky/pre-push ]; then
  pass "Pre-push hook is executable"
else
  chmod +x .husky/pre-push
  warn "Pre-push hook was not executable — fixed"
fi

# ─── 4. Check environment file ─────────────────────────────────────────────

header "4. Checking environment"

if [ -f .env ]; then
  pass ".env file exists"

  # Check required variables
  if grep -q "DATABASE_URL=" .env; then
    pass "DATABASE_URL is set"
  else
    fail "DATABASE_URL missing from .env"
    errors=$((errors + 1))
  fi

  if grep -q "SESSION_SECRET=" .env; then
    pass "SESSION_SECRET is set"
  else
    fail "SESSION_SECRET missing from .env"
    errors=$((errors + 1))
  fi

  # Check optional but recommended
  if grep -q "RESEND_API_KEY=" .env && ! grep -q "RESEND_API_KEY=re_xxxxx" .env; then
    pass "RESEND_API_KEY is set"
  else
    warn "RESEND_API_KEY not configured — magic link emails won't work"
  fi
else
  warn ".env file not found — copy from .env.example and configure:"
  warn "  cp .env.example .env"
fi

# ─── 5. Check git remote ───────────────────────────────────────────────────

header "5. Checking git configuration"

remote_url=$(git remote get-url origin 2>/dev/null || echo "")
if echo "$remote_url" | grep -q "Art-World-Hub"; then
  pass "Git remote: $remote_url"
else
  fail "Git remote doesn't point to Art-World-Hub"
  errors=$((errors + 1))
fi

current_branch=$(git branch --show-current)
pass "Current branch: $current_branch"

if [ "$current_branch" = "main" ]; then
  warn "You're on main — remember to create a feature branch before coding"
fi

# ─── 6. Quick build check ──────────────────────────────────────────────────

header "6. Verifying project builds"

if npm run check 2>&1 | tail -1 | grep -q "error"; then
  fail "TypeScript type check failed"
  errors=$((errors + 1))
else
  pass "TypeScript type check passes"
fi

if npm test 2>&1 | grep -q "Tests.*passed"; then
  test_count=$(npm test 2>&1 | grep "Tests" | grep -oP '\d+ passed')
  pass "Tests pass ($test_count)"
else
  fail "Tests failed"
  errors=$((errors + 1))
fi

# ─── Summary ───────────────────────────────────────────────────────────────

header "Setup complete"

if [ $errors -eq 0 ]; then
  echo -e "\n  ${GREEN}All checks passed.${NC} Environment is ready for development."
  echo ""
  echo "  Quick reference:"
  echo "    npm run dev          Start dev server (port 5000)"
  echo "    npm run check        TypeScript type check"
  echo "    npm test             Run tests"
  echo "    npm run build        Production build"
  echo ""
else
  echo -e "\n  ${RED}$errors error(s) found.${NC} Fix them before starting development."
  exit 1
fi
