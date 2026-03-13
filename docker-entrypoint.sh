#!/bin/sh
set -e

# Ensure upload subdirectories exist (volume mount may lack new ones)
mkdir -p /app/uploads/artworks /app/uploads/blog-covers /app/uploads/avatars

if [ "$DB_MIGRATION_MODE" = "migrate" ]; then
  echo "Running database migrations..."
  npx drizzle-kit migrate
  echo "Migrations complete."
else
  echo "Pushing database schema..."
  npx drizzle-kit push --force
  echo "Schema push complete."
fi

exec "$@"
