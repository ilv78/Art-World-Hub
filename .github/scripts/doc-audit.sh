#!/usr/bin/env bash
# Documentation Audit Script
# Checks structure rules (S-*), staleness rules (ST-*), and quality rules (Q-*)
# Produces a markdown report suitable for a GitHub issue body.

set -euo pipefail

ERRORS=()
WARNINGS=()
INFOS=()

# --- Helper functions ---

days_since_last_commit() {
  local file="$1"
  local last_commit
  last_commit=$(git log -1 --format="%ct" -- "$file" 2>/dev/null || echo "0")
  if [ "$last_commit" = "0" ]; then
    echo "9999"
    return
  fi
  local now
  now=$(date +%s)
  echo $(( (now - last_commit) / 86400 ))
}

# Most recent commit on `file` whose author email is not dependabot[bot].
# Falls back to the absolute latest commit if the file has only ever been
# touched by the bot. Used by staleness rules that would otherwise re-fire
# every time Dependabot bumps a pinned Action/package SHA without changing
# the file's semantics.
days_since_last_human_commit() {
  local file="$1"
  local ts
  ts=$(git log --format='%ct|%ae' -- "$file" 2>/dev/null \
    | awk -F'|' '$2 !~ /dependabot\[bot\]/ { print $1; exit }')
  if [ -z "$ts" ]; then
    ts=$(git log -1 --format="%ct" -- "$file" 2>/dev/null || echo "0")
  fi
  if [ -z "$ts" ] || [ "$ts" = "0" ]; then
    echo "9999"
    return
  fi
  local now
  now=$(date +%s)
  echo $(( (now - ts) / 86400 ))
}

file_has_changed_since() {
  local file="$1"
  local reference_file="$2"
  local threshold_days="$3"
  local ref_days
  ref_days=$(days_since_last_commit "$reference_file")
  local file_days
  file_days=$(days_since_last_commit "$file")
  # If reference file changed more recently than the doc file, and the gap exceeds threshold
  if [ "$ref_days" -lt "$file_days" ] && [ $(( file_days - ref_days )) -gt "$threshold_days" ]; then
    return 0  # true: doc is stale
  fi
  return 1  # false: doc is fresh enough
}

# Like file_has_changed_since, but ignores Dependabot-only commits on the
# reference file so SHA-pin bumps do not mark the doc as stale.
file_has_changed_by_human_since() {
  local file="$1"
  local reference_file="$2"
  local threshold_days="$3"
  local ref_days
  ref_days=$(days_since_last_human_commit "$reference_file")
  local file_days
  file_days=$(days_since_last_commit "$file")
  if [ "$ref_days" -lt "$file_days" ] && [ $(( file_days - ref_days )) -gt "$threshold_days" ]; then
    return 0
  fi
  return 1
}

# --- Structure Rules (S-*) ---

# S-001
if [ ! -s "specs/architecture/OVERVIEW.md" ]; then
  ERRORS+=("[S-001] \`specs/architecture/OVERVIEW.md\` must exist and be non-empty.")
fi

# S-002
if [ ! -s "specs/workflows/LOCAL-DEV.md" ]; then
  ERRORS+=("[S-002] \`specs/workflows/LOCAL-DEV.md\` must exist and be non-empty.")
fi

# S-003
if [ ! -s "specs/workflows/CI-CD.md" ]; then
  ERRORS+=("[S-003] \`specs/workflows/CI-CD.md\` must exist and be non-empty.")
fi

# S-004: ADR files must follow naming pattern ADR-XXXX-*.md
for f in specs/architecture/ADR/*.md; do
  [ -e "$f" ] || continue
  basename="$(basename "$f")"
  if [[ ! "$basename" =~ ^ADR-[0-9]{4}-.+\.md$ ]]; then
    ERRORS+=("[S-004] ADR file \`$f\` does not follow naming pattern \`ADR-XXXX-title.md\`.")
  fi
done

# S-006
if [ ! -s "CLAUDE.md" ]; then
  ERRORS+=("[S-006] \`CLAUDE.md\` must exist at the repo root.")
fi

# --- Staleness Rules (ST-*) ---

# ST-001: DATA-MODEL.md not updated after Drizzle schema change (7 days)
for schema_file in shared/schema.ts shared/models/auth.ts; do
  if [ -f "$schema_file" ] && [ -f "specs/architecture/DATA-MODEL.md" ]; then
    if file_has_changed_since "specs/architecture/DATA-MODEL.md" "$schema_file" 7; then
      WARNINGS+=("[ST-001] \`specs/architecture/DATA-MODEL.md\` may be stale — \`$schema_file\` was updated more recently (threshold: 7 days).")
    fi
  fi
done

# ST-002: Active SPEC.md not touched in 90 days
for f in specs/features/*/SPEC.md; do
  [ -e "$f" ] || continue
  if grep -q '^\*\*Status:\*\* Active' "$f" 2>/dev/null; then
    age=$(days_since_last_commit "$f")
    if [ "$age" -gt 90 ]; then
      WARNINGS+=("[ST-002] \`$f\` is Active but hasn't been updated in ${age} days (threshold: 90 days).")
    fi
  fi
done

# ST-003: OVERVIEW.md not updated after new feature SPEC.md added (14 days)
for f in specs/features/*/SPEC.md; do
  [ -e "$f" ] || continue
  if [ -f "specs/architecture/OVERVIEW.md" ]; then
    if file_has_changed_since "specs/architecture/OVERVIEW.md" "$f" 14; then
      WARNINGS+=("[ST-003] \`specs/architecture/OVERVIEW.md\` may be stale — \`$f\` was added/updated more recently (threshold: 14 days).")
      break  # Only report once
    fi
  fi
done

# ST-004: CI-CD.md not updated after workflow changes (7 days)
# Uses the human-commit variant so Dependabot-only SHA-pin bumps do not
# mark the spec stale (see specs/decisions/DECISION-LOG.md, 2026-04-20).
for f in .github/workflows/*.yml; do
  [ -e "$f" ] || continue
  if [ -f "specs/workflows/CI-CD.md" ]; then
    if file_has_changed_by_human_since "specs/workflows/CI-CD.md" "$f" 7; then
      WARNINGS+=("[ST-004] \`specs/workflows/CI-CD.md\` may be stale — \`$f\` was updated more recently (threshold: 7 days).")
      break
    fi
  fi
done

# ST-005: DEPLOYMENT.md not updated after Docker changes (7 days)
for f in Dockerfile deploy/*/docker-compose.yml; do
  [ -e "$f" ] || continue
  if [ -f "specs/workflows/DEPLOYMENT.md" ]; then
    if file_has_changed_since "specs/workflows/DEPLOYMENT.md" "$f" 7; then
      WARNINGS+=("[ST-005] \`specs/workflows/DEPLOYMENT.md\` may be stale — \`$f\` was updated more recently (threshold: 7 days).")
      break
    fi
  fi
done

# DOC-AGENT-SPEC.md quarterly review (90 days)
if [ -f "specs/DOC-AGENT-SPEC.md" ]; then
  age=$(days_since_last_commit "specs/DOC-AGENT-SPEC.md")
  if [ "$age" -gt 90 ]; then
    WARNINGS+=("[ST-SPEC] \`specs/DOC-AGENT-SPEC.md\` hasn't been reviewed in ${age} days (quarterly review required).")
  fi
fi

# --- Quality Rules (Q-*) ---

# Q-001: SPEC.md files with fewer than 100 words
for f in specs/features/*/SPEC.md; do
  [ -e "$f" ] || continue
  word_count=$(wc -w < "$f")
  if [ "$word_count" -lt 100 ]; then
    INFOS+=("[Q-001] \`$f\` has only ${word_count} words — flagged as a stub (minimum: 100 words).")
  fi
done

# Q-003: TODO or TBD in Active documents
for f in $(find specs/ -name "*.md" -type f); do
  if grep -q '^\*\*Status:\*\* Active' "$f" 2>/dev/null; then
    if grep -qiE '\bTODO\b|\bTBD\b' "$f" 2>/dev/null; then
      INFOS+=("[Q-003] \`$f\` is Active but contains TODO/TBD placeholders.")
    fi
  fi
done

# Q-004: Broken internal links (check markdown links to specs/ files)
for f in $(find specs/ -name "*.md" -type f); do
  while IFS= read -r link; do
    # Extract the path from markdown links like [text](path)
    target=$(echo "$link" | sed -E 's/.*\]\(([^)#]+).*/\1/')
    # Only check relative links to specs/
    if [[ "$target" == specs/* ]] && [ ! -e "$target" ]; then
      INFOS+=("[Q-004] Broken link in \`$f\`: \`$target\` does not exist.")
    fi
  done < <(grep -oE '\[[^]]*\]\([^)]+\)' "$f" 2>/dev/null || true)
done

# --- Compile Report ---

echo "## 📋 Docs Audit Report"
echo ""
echo "| Severity | Count |"
echo "|---|---|"
echo "| 🔴 Errors | ${#ERRORS[@]} |"
echo "| 🟡 Warnings | ${#WARNINGS[@]} |"
echo "| 🟢 Info | ${#INFOS[@]} |"
echo ""

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "### 🔴 Errors"
  for e in "${ERRORS[@]}"; do
    echo "- [ ] $e"
  done
  echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "### 🟡 Warnings"
  for w in "${WARNINGS[@]}"; do
    echo "- [ ] $w"
  done
  echo ""
fi

if [ ${#INFOS[@]} -gt 0 ]; then
  echo "### 🟢 Info"
  for i in "${INFOS[@]}"; do
    echo "- $i"
  done
  echo ""
fi

if [ ${#ERRORS[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ] && [ ${#INFOS[@]} -eq 0 ]; then
  echo "✅ All documentation rules pass. No issues found."
  echo ""
fi

echo "---"
echo "_Documentation Agent · [View Full Spec](specs/DOC-AGENT-SPEC.md)_"

# Exit with error code if there are errors (for CI gating in the future)
if [ ${#ERRORS[@]} -gt 0 ]; then
  exit 1
fi
exit 0
