#!/bin/sh
set -e

if [ "$DB_MIGRATION_MODE" = "migrate" ]; then
  echo "Running database migrations..."
  npx drizzle-kit migrate
  echo "Migrations complete."
else
  echo "Pushing database schema..."
  # drizzle-kit push exits 0 even when it aborts — on an interactive prompt it
  # cannot answer without a TTY, or on a failed statement — leaving the app to
  # boot on a stale schema (#833). Detect the failure from its output instead.
  PUSH_LOG=$(mktemp)
  if ! npx drizzle-kit push --force > "$PUSH_LOG" 2>&1; then
    cat "$PUSH_LOG"
    echo "Schema push FAILED (non-zero exit) — refusing to start on a stale schema."
    exit 1
  fi
  cat "$PUSH_LOG"
  if grep -qE '^(Error|error)[:[]|Interactive prompts require a TTY' "$PUSH_LOG"; then
    echo "Schema push FAILED (drizzle-kit reported an error but exited 0) — refusing to start on a stale schema."
    echo "Apply the pending migration SQL to this database manually; see specs/AGENT-AUTONOMY-POLICY.md §6."
    exit 1
  fi
  rm -f "$PUSH_LOG"
  echo "Schema push complete."
fi

exec "$@"
