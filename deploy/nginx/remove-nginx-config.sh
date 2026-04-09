#!/usr/bin/env bash
# =============================================================================
# remove-nginx-config.sh — safely remove an nginx config file
# Installed at /usr/local/bin/remove-nginx-config on the host.
# Called via sudo by staging/production users.
#
# Usage: sudo remove-nginx-config <config-name>
# Example: sudo remove-nginx-config preview.artverse.idata.ro.conf
#
# Removes both /etc/nginx/sites-enabled/<name> and /etc/nginx/sites-available/<name>,
# tests config, and reloads nginx. Backs up to /etc/nginx/.removed/ first and
# restores on failure. Refuses if neither file exists, or if the sites-enabled
# entry is a symlink to a path outside /etc/nginx/sites-available/ (safety).
#
# Companion to deploy-nginx-config.sh — shares the same /var/lock to prevent
# concurrent nginx config operations.
# =============================================================================
set -uo pipefail

NAME="${1:?Usage: remove-nginx-config <config-name>}"

# Validate config name (alphanumeric, dots, hyphens, underscores only — no path traversal)
if [[ ! "$NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "ERROR: Invalid config name '$NAME' — must match [a-zA-Z0-9._-]+"
  exit 1
fi

AVAILABLE="/etc/nginx/sites-available/$NAME"
ENABLED="/etc/nginx/sites-enabled/$NAME"
LOCK="/var/lock/deploy-nginx-config.lock"
BACKUP_DIR="/etc/nginx/.removed"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="$BACKUP_DIR/$NAME.$TIMESTAMP"

# Refuse if there's nothing to remove
if [[ ! -e "$AVAILABLE" && ! -L "$ENABLED" && ! -e "$ENABLED" ]]; then
  echo "ERROR: No config named '$NAME' found in sites-enabled or sites-available"
  exit 1
fi

# Refuse if sites-enabled symlink points outside sites-available — clean up manually
if [[ -L "$ENABLED" ]]; then
  TARGET=$(readlink -f "$ENABLED")
  if [[ "$TARGET" != "$AVAILABLE" && "$TARGET" != /etc/nginx/sites-available/* ]]; then
    echo "ERROR: $ENABLED is a symlink to '$TARGET' (outside sites-available); refusing to remove. Clean up manually."
    exit 1
  fi
fi

# Acquire exclusive lock — same lock as deploy-nginx-config so they can't race
exec 200>"$LOCK"
flock -n 200 || { echo "ERROR: Another nginx config operation is in progress"; exit 1; }

mkdir -p "$BACKUP_DIR"

# Back up the actual config content (for restore-on-failure)
if [[ -f "$AVAILABLE" ]]; then
  cp "$AVAILABLE" "$BACKUP"
  echo "Backed up $AVAILABLE → $BACKUP"
elif [[ -L "$ENABLED" ]]; then
  TARGET=$(readlink -f "$ENABLED")
  if [[ -f "$TARGET" ]]; then
    cp "$TARGET" "$BACKUP"
    echo "Backed up $TARGET (via $ENABLED) → $BACKUP"
  fi
fi

restore() {
  echo "Restoring from backup"
  if [[ -f "$BACKUP" ]]; then
    cp "$BACKUP" "$AVAILABLE"
    ln -sf "$AVAILABLE" "$ENABLED"
    echo "Restored $AVAILABLE and $ENABLED"
  fi
}

echo "=== Removing $NAME ==="
if [[ -e "$ENABLED" || -L "$ENABLED" ]]; then
  rm -f "$ENABLED"
  echo "Removed $ENABLED"
fi
if [[ -e "$AVAILABLE" ]]; then
  rm -f "$AVAILABLE"
  echo "Removed $AVAILABLE"
fi

echo "=== Testing nginx config ==="
if nginx -t 2>&1; then
  echo "=== Reloading nginx ==="
  nginx -s reload
  echo "Done — $NAME removed (backup at $BACKUP)"
else
  echo "ERROR: nginx config test failed, restoring"
  restore
  exit 1
fi
