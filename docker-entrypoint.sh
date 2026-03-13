#!/bin/sh
set -e

# Ensure upload subdirs exist and are writable by appuser
# (Docker volume mount may not have newly added subdirectories)
mkdir -p /app/uploads/artworks /app/uploads/blog-covers /app/uploads/avatars
chown -R appuser:appgroup /app/uploads

if [ "$DB_MIGRATION_MODE" = "migrate" ]; then
  echo "Running database migrations..."
  gosu appuser npx drizzle-kit migrate
  echo "Migrations complete."
else
  echo "Pushing database schema..."
  gosu appuser npx drizzle-kit push --force
  echo "Schema push complete."
fi

exec gosu appuser "$@"
