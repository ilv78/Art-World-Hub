#!/usr/bin/env bash
# =============================================================================
# deploy-nginx-config.sh — safely deploy an nginx config file
# Installed at /usr/local/bin/deploy-nginx-config on the host.
# Called via sudo by staging/production users.
#
# Usage: sudo deploy-nginx-config <source-file> <config-name>
# Example: sudo deploy-nginx-config /tmp/vernis9.art vernis9.art
#
# Copies to /etc/nginx/sites-available/<name>, symlinks from sites-enabled,
# tests config, and reloads nginx. Rolls back on failure.
# =============================================================================
set -euo pipefail

SOURCE="${1:?Usage: deploy-nginx-config <source-file> <config-name>}"
NAME="${2:?Usage: deploy-nginx-config <source-file> <config-name>}"

# Validate config name (alphanumeric, dots, hyphens, underscores only)
if [[ ! "$NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "ERROR: Invalid config name '$NAME' — must match [a-zA-Z0-9._-]+"
  exit 1
fi

if [[ ! -f "$SOURCE" ]]; then
  echo "ERROR: Source file '$SOURCE' not found"
  exit 1
fi

AVAILABLE="/etc/nginx/sites-available/$NAME"
ENABLED="/etc/nginx/sites-enabled/$NAME"

# Back up existing config if present
if [[ -f "$AVAILABLE" ]]; then
  cp "$AVAILABLE" "$AVAILABLE.bak"
  echo "Backed up existing $AVAILABLE → $AVAILABLE.bak"
fi

echo "=== Deploying $NAME ==="
cp "$SOURCE" "$AVAILABLE"
echo "Copied to $AVAILABLE"

# Create symlink if not already present
if [[ ! -L "$ENABLED" ]]; then
  ln -sf "$AVAILABLE" "$ENABLED"
  echo "Symlinked $ENABLED → $AVAILABLE"
fi

echo "=== Testing nginx config ==="
if nginx -t 2>&1; then
  echo "=== Reloading nginx ==="
  nginx -s reload
  echo "Done — $NAME is live"
else
  echo "ERROR: nginx config test failed, rolling back"
  if [[ -f "$AVAILABLE.bak" ]]; then
    mv "$AVAILABLE.bak" "$AVAILABLE"
    echo "Restored previous $AVAILABLE"
    nginx -s reload
  else
    rm -f "$AVAILABLE" "$ENABLED"
    echo "Removed $AVAILABLE and $ENABLED"
  fi
  exit 1
fi

# Clean up backup on success
rm -f "$AVAILABLE.bak"
