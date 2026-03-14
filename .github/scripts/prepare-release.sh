#!/usr/bin/env bash
# prepare-release.sh — Determine next version, generate CHANGELOG entries,
# and update CHANGELOG.md for a new release.
#
# Called by .github/workflows/release.yml
#
# Required env vars:
#   GH_TOKEN, GITHUB_REPOSITORY
# Optional env vars:
#   BUMP_OVERRIDE ("minor" | "major") — force a specific version bump
#
# Outputs (via $GITHUB_OUTPUT):
#   version, tag, changelog_body, issue_numbers, bump_type, skip

set -euo pipefail

CHANGELOG="CHANGELOG.md"

# --- 1. Get closed issues labeled "release: next" ---
ISSUES_JSON=$(gh issue list --label "release: next" --state closed --json number,title,labels --limit 100)
ISSUE_COUNT=$(echo "$ISSUES_JSON" | jq 'length')

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "No closed issues with 'release: next' label — skipping release."
  echo "skip=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "Found $ISSUE_COUNT issue(s) for release."

# --- 2. Parse latest version tag ---
LATEST_TAG=$(git tag --list 'v*' --sort=-v:refname | head -1)
if [ -z "$LATEST_TAG" ]; then
  echo "No existing version tags found, starting from v0.0.0"
  MAJOR=0; MINOR=0; PATCH=0
else
  VERSION="${LATEST_TAG#v}"
  MAJOR=$(echo "$VERSION" | cut -d. -f1)
  MINOR=$(echo "$VERSION" | cut -d. -f2)
  PATCH=$(echo "$VERSION" | cut -d. -f3)
  echo "Latest version: $LATEST_TAG"
fi

# --- 3. Detect bump type ---
BUMP="patch"
for i in $(seq 0 $((ISSUE_COUNT - 1))); do
  ISSUE_LABELS=$(echo "$ISSUES_JSON" | jq -r ".[$i].labels[].name")
  if echo "$ISSUE_LABELS" | grep -qE '^(feature|enhancement)$'; then
    BUMP="minor"
    break
  fi
done

if [ -n "${BUMP_OVERRIDE:-}" ] && [ "$BUMP_OVERRIDE" != "" ]; then
  BUMP="$BUMP_OVERRIDE"
  echo "Bump override: $BUMP"
fi

case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
NEW_TAG="v${NEW_VERSION}"
DATE=$(date +%Y-%m-%d)

echo "New version: $NEW_TAG ($BUMP bump)"

# --- 4. Categorize issues ---
ADDED_ITEMS=""
FIXED_ITEMS=""
CHANGED_ITEMS=""
SECURITY_ITEMS=""
ISSUE_NUMBERS=""
SKIPPED=0

for i in $(seq 0 $((ISSUE_COUNT - 1))); do
  NUMBER=$(echo "$ISSUES_JSON" | jq -r ".[$i].number")
  TITLE=$(echo "$ISSUES_JSON" | jq -r ".[$i].title")
  LABELS_CSV=$(echo "$ISSUES_JSON" | jq -r "[.[$i].labels[].name] | join(\",\")")

  ISSUE_NUMBERS="${ISSUE_NUMBERS}${ISSUE_NUMBERS:+ }${NUMBER}"
  ENTRY="- ${TITLE} ([#${NUMBER}](https://github.com/${GITHUB_REPOSITORY}/issues/${NUMBER}))"

  # documentation-only → skip from CHANGELOG (still remove label later)
  if echo ",$LABELS_CSV," | grep -q ',documentation,' && \
     ! echo ",$LABELS_CSV," | grep -qE ',(feature|enhancement|bug|refactor|devops|ui/ux),'; then
    echo "  #${NUMBER}: skipped (documentation-only)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Categorize by label priority: security > feature/enhancement > bug > other
  if echo ",$LABELS_CSV," | grep -qi ',security,' || echo "$TITLE" | grep -qi 'security'; then
    SECURITY_ITEMS="${SECURITY_ITEMS}${ENTRY}"$'\n'
    echo "  #${NUMBER}: Security"
  elif echo ",$LABELS_CSV," | grep -qE ',(feature|enhancement),'; then
    ADDED_ITEMS="${ADDED_ITEMS}${ENTRY}"$'\n'
    echo "  #${NUMBER}: Added"
  elif echo ",$LABELS_CSV," | grep -q ',bug,'; then
    FIXED_ITEMS="${FIXED_ITEMS}${ENTRY}"$'\n'
    echo "  #${NUMBER}: Fixed"
  elif echo ",$LABELS_CSV," | grep -qE ',(refactor|devops|ui/ux),'; then
    CHANGED_ITEMS="${CHANGED_ITEMS}${ENTRY}"$'\n'
    echo "  #${NUMBER}: Changed"
  else
    CHANGED_ITEMS="${CHANGED_ITEMS}${ENTRY}"$'\n'
    echo "  #${NUMBER}: Changed (default)"
  fi
done

# If all issues were documentation-only, skip the release
CATEGORIZED=$((ISSUE_COUNT - SKIPPED))
if [ "$CATEGORIZED" -eq 0 ]; then
  echo "All issues are documentation-only — skipping release."
  echo "skip=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

# --- 5. Build changelog body ---
BODY=""
if [ -n "$ADDED_ITEMS" ]; then
  BODY="${BODY}### Added"$'\n'"${ADDED_ITEMS}"$'\n'
fi
if [ -n "$FIXED_ITEMS" ]; then
  BODY="${BODY}### Fixed"$'\n'"${FIXED_ITEMS}"$'\n'
fi
if [ -n "$SECURITY_ITEMS" ]; then
  BODY="${BODY}### Security"$'\n'"${SECURITY_ITEMS}"$'\n'
fi
if [ -n "$CHANGED_ITEMS" ]; then
  BODY="${BODY}### Changed"$'\n'"${CHANGED_ITEMS}"$'\n'
fi

# Remove trailing whitespace
BODY=$(echo "$BODY" | sed -e 's/[[:space:]]*$//')

# --- 6. Merge any existing [Unreleased] content ---
UNRELEASED_CONTENT=$(awk '/^## \[Unreleased\]/{found=1; next} /^## \[/{found=0} found{print}' "$CHANGELOG" | \
  grep -v '^_Nothing yet' | sed '/^$/d' || true)

if [ -n "$UNRELEASED_CONTENT" ]; then
  echo "Merging existing unreleased content into release..."
  BODY="${BODY}"$'\n\n'"${UNRELEASED_CONTENT}"
fi

# --- 7. Update CHANGELOG.md in place ---
# Build the new version section (header + body)
NEW_SECTION="## [${NEW_VERSION}] - ${DATE}"$'\n\n'"${BODY}"

# Remove any existing section for this version (prevents duplicates if re-releasing)
if grep -q "^## \[${NEW_VERSION}\]" "$CHANGELOG"; then
  echo "Removing existing [${NEW_VERSION}] section to prevent duplicates..."
  export _RM_VERSION="$NEW_VERSION"
  awk '
    /^## \[/ && index($0, "[" ENVIRON["_RM_VERSION"] "]") > 0 {skip=1; next}
    /^## \[/ && skip {skip=0}
    !skip {print}
  ' "$CHANGELOG" > "${CHANGELOG}.tmp"
  mv "${CHANGELOG}.tmp" "$CHANGELOG"
  unset _RM_VERSION
fi

# Use awk with ENVIRON to avoid escape sequence issues:
# - After [Unreleased], insert reset placeholder + new version section
# - Skip old unreleased content until next version header
export _NEW_SECTION="$NEW_SECTION"
export _NEW_VERSION="$NEW_VERSION"
awk '
  /^## \[Unreleased\]/ {
    print
    print ""
    print "_Nothing yet — all recent work included in v" ENVIRON["_NEW_VERSION"] " below._"
    print ""
    print ENVIRON["_NEW_SECTION"]
    print ""
    skip = 1
    next
  }
  /^## \[/ && skip {
    skip = 0
  }
  !skip { print }
' "$CHANGELOG" > "${CHANGELOG}.tmp"
mv "${CHANGELOG}.tmp" "$CHANGELOG"
unset _NEW_SECTION _NEW_VERSION

echo "CHANGELOG.md updated."

# --- 8. Write outputs ---
echo "skip=false" >> "$GITHUB_OUTPUT"
echo "version=${NEW_VERSION}" >> "$GITHUB_OUTPUT"
echo "tag=${NEW_TAG}" >> "$GITHUB_OUTPUT"
echo "bump_type=${BUMP}" >> "$GITHUB_OUTPUT"
echo "issue_numbers=${ISSUE_NUMBERS}" >> "$GITHUB_OUTPUT"

# Multi-line output for changelog_body
{
  echo "changelog_body<<CHANGELOG_EOF"
  echo "$BODY"
  echo "CHANGELOG_EOF"
} >> "$GITHUB_OUTPUT"

echo "Done — ${NEW_TAG} ready for release."
