#!/usr/bin/env bash
# update-issue-tracker.sh — Auto-update specs/issue-tracker.md when an issue is closed.
# Called by .github/workflows/issue-tracker.yml with env vars from the GitHub event.
#
# Required env vars:
#   ISSUE_NUMBER, ISSUE_TITLE, ISSUE_LABELS (comma-separated),
#   ISSUE_CLOSED_AT, GH_TOKEN (for gh CLI)
#
# What it does:
#   1. Determine priority and category from labels
#   2. Find the linked PR (merged, referencing this issue) and branch
#   3. Move the issue from Active → Completed in issue-tracker.md, or append it
#   4. Add a revision log entry
#   5. If labeled "bug", create specs/bugs/BUG-XXXX-title.md (if it doesn't exist)

set -euo pipefail

TRACKER="specs/issue-tracker.md"
BUGS_DIR="specs/bugs"
DATE=$(echo "$ISSUE_CLOSED_AT" | cut -d'T' -f1)

# --- Label parsing ---
PRIORITY=""
CATEGORY=""

IFS=',' read -ra LABEL_ARRAY <<< "$ISSUE_LABELS"
for label in "${LABEL_ARRAY[@]}"; do
  label=$(echo "$label" | xargs)  # trim whitespace
  case "$label" in
    "priority: critical") PRIORITY="critical" ;;
    "priority: high")     PRIORITY="high" ;;
    "priority: medium")   PRIORITY="medium" ;;
    "priority: low")      PRIORITY="low" ;;
    bug|feature|enhancement|ui/ux|refactor|devops|documentation)
      if [ -n "$CATEGORY" ]; then
        CATEGORY="$CATEGORY, $label"
      else
        CATEGORY="$label"
      fi
      ;;
  esac
done

PRIORITY="${PRIORITY:-—}"
CATEGORY="${CATEGORY:-—}"

# --- Find linked PR ---
# Search for merged PRs that reference this issue number in their body or title
PR_NUMBER=""
BRANCH=""

# Try to find a merged PR that closes this issue
PR_DATA=$(gh pr list --state merged --search "closes #${ISSUE_NUMBER}" --json number,headRefName --limit 1 2>/dev/null || true)
if [ -z "$PR_DATA" ] || [ "$PR_DATA" = "[]" ]; then
  # Fallback: search for PR referencing this issue number
  PR_DATA=$(gh pr list --state merged --search "#${ISSUE_NUMBER}" --json number,headRefName --limit 1 2>/dev/null || true)
fi

if [ -n "$PR_DATA" ] && [ "$PR_DATA" != "[]" ]; then
  PR_NUMBER=$(echo "$PR_DATA" | jq -r '.[0].number // empty')
  BRANCH=$(echo "$PR_DATA" | jq -r '.[0].headRefName // empty')
fi

PR_DISPLAY="${PR_NUMBER:+#$PR_NUMBER}"
PR_DISPLAY="${PR_DISPLAY:-—}"
BRANCH_DISPLAY="${BRANCH:+\`$BRANCH\`}"
BRANCH_DISPLAY="${BRANCH_DISPLAY:-—}"

echo "Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}"
echo "  Priority: ${PRIORITY}, Category: ${CATEGORY}"
echo "  PR: ${PR_DISPLAY}, Branch: ${BRANCH:-none}, Date: ${DATE}"

# --- Update issue-tracker.md ---

# Check if issue is in the Active table (use grep -F for fixed string matching)
ACTIVE_MATCH="| ${ISSUE_NUMBER} |"
IN_ACTIVE=$(grep -cF "$ACTIVE_MATCH" "$TRACKER" || true)

if [ "$IN_ACTIVE" -gt 0 ]; then
  echo "Moving issue #${ISSUE_NUMBER} from Active to Completed..."

  # Remove from Active table — use awk for exact field matching
  awk -v num="$ISSUE_NUMBER" '!($0 ~ "^[|] " num " [|]")' "$TRACKER" > "${TRACKER}.tmp"
  mv "${TRACKER}.tmp" "$TRACKER"
fi

# Append to Completed table (before the --- after the Completed section)
# Find the line number of "## Completed Issues" and the next "---" after it
COMPLETED_HEADER_LINE=$(grep -n "^## Completed Issues" "$TRACKER" | head -1 | cut -d: -f1)
# Find the separator line after the completed table
SEPARATOR_LINE=$(tail -n +"$COMPLETED_HEADER_LINE" "$TRACKER" | grep -n "^---$" | head -1 | cut -d: -f1)
# Absolute line number for the separator
INSERT_BEFORE=$((COMPLETED_HEADER_LINE + SEPARATOR_LINE - 1))

# Build the new row
NEW_ROW="| ${ISSUE_NUMBER} | ${ISSUE_TITLE} | ${PRIORITY} | ${CATEGORY} | ${DATE} | ${BRANCH_DISPLAY} | ${PR_DISPLAY} |"

# Insert the new row before the separator using awk
# Use ENVIRON to avoid awk interpreting escape sequences in the row text
export _INSERT_ROW="$NEW_ROW"
awk -v line="$INSERT_BEFORE" 'NR==line{print ENVIRON["_INSERT_ROW"]} {print}' "$TRACKER" > "${TRACKER}.tmp"
mv "${TRACKER}.tmp" "$TRACKER"
unset _INSERT_ROW

echo "Added to Completed table."

# --- Add revision log entry ---
REVISION_ENTRY="| ${DATE} | Auto-closed #${ISSUE_NUMBER} (${ISSUE_TITLE})."
if [ "$IN_ACTIVE" -gt 0 ]; then
  REVISION_ENTRY="${REVISION_ENTRY} Moved from Active to Completed."
else
  REVISION_ENTRY="${REVISION_ENTRY} Added to Completed."
fi
if [ -n "$PR_NUMBER" ]; then
  REVISION_ENTRY="${REVISION_ENTRY} PR #${PR_NUMBER}."
fi
REVISION_ENTRY="${REVISION_ENTRY} |"

# Append to the end of the file (revision log is the last section)
echo "$REVISION_ENTRY" >> "$TRACKER"

echo "Added revision log entry."

# --- Bug doc creation ---
IS_BUG=false
for label in "${LABEL_ARRAY[@]}"; do
  label=$(echo "$label" | xargs)
  if [ "$label" = "bug" ]; then
    IS_BUG=true
    break
  fi
done

if [ "$IS_BUG" = true ]; then
  # Check for existing bug doc by issue number (any slug)
  BUG_PREFIX="BUG-$(printf '%04d' "$ISSUE_NUMBER")"
  EXISTING_BUG=$(find "$BUGS_DIR" -name "${BUG_PREFIX}-*.md" -print -quit 2>/dev/null || true)

  if [ -n "$EXISTING_BUG" ]; then
    BUG_FILE="$EXISTING_BUG"
  else
    # Generate slug from title for new file
    SLUG=$(echo "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
    BUG_FILE="${BUGS_DIR}/${BUG_PREFIX}-${SLUG}.md"
  fi

  if [ -n "$EXISTING_BUG" ]; then
    echo "Bug doc already exists: ${BUG_FILE} — updating status to Resolved."
    # Update status to Resolved
    sed -i 's/^\*\*Status:\*\* .*/\*\*Status:\*\* Resolved/' "$BUG_FILE"
    sed -i "s/^\*\*Last Updated:\*\* .*/\*\*Last Updated:\*\* ${DATE}/" "$BUG_FILE"
    # Add fix reference if PR exists and no fix is documented yet
    if [ -n "$PR_NUMBER" ]; then
      if grep -q "^(fill in when resolved" "$BUG_FILE"; then
        sed -i "s|^(fill in when resolved.*|Resolved in PR #${PR_NUMBER}.|" "$BUG_FILE"
      fi
    fi
  else
    echo "Creating bug doc: ${BUG_FILE}"
    mkdir -p "$BUGS_DIR"

    # Determine severity from priority
    SEVERITY="Medium"
    case "$PRIORITY" in
      critical) SEVERITY="Critical" ;;
      high)     SEVERITY="High" ;;
      medium)   SEVERITY="Medium" ;;
      low)      SEVERITY="Low" ;;
    esac

    FIX_TEXT="(fill in when resolved — reference PR)"
    if [ -n "$PR_NUMBER" ]; then
      FIX_TEXT="Resolved in PR #${PR_NUMBER}."
    fi

    cat > "$BUG_FILE" << BUGEOF
# BUG-$(printf '%04d' "$ISSUE_NUMBER"): ${ISSUE_TITLE}

**Status:** Resolved
**Severity:** ${SEVERITY}
**Last Updated:** ${DATE}
**Reporter:** GitHub Issue #${ISSUE_NUMBER}

## Description

${ISSUE_TITLE}. See [GitHub Issue #${ISSUE_NUMBER}](https://github.com/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}) for full details.

## Reproduction Steps

1. See GitHub issue for details

## Root Cause

See GitHub issue and linked PR for root cause analysis.

## Fix

${FIX_TEXT}
BUGEOF
  fi
fi

echo "Done."
