#!/usr/bin/env bash
# =============================================================================
# ArtVerse backup restore (#682)
#
# Usage:
#   restore.sh --dump <file> [--target scratch|staging|production] [--i-mean-it]
#
#   scratch     (default) — restore into a throwaway local container and print
#                           row counts. This is the restore drill; it touches
#                           nothing real and is safe to run any time.
#   staging     — restore into the staging database. Destructive to staging.
#   production  — restore into the production database. Requires --i-mean-it.
#
# Runs on the dev VPS, against dumps produced by pull-backup.sh.
# =============================================================================
set -euo pipefail

DUMP=""
TARGET="scratch"
CONFIRMED=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dump)       DUMP="${2:?--dump needs a file}"; shift 2 ;;
    --target)     TARGET="${2:?--target needs a value}"; shift 2 ;;
    --i-mean-it)  CONFIRMED=1; shift ;;
    -h|--help)    sed -n '2,18p' "$0"; exit 0 ;;
    *)            echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$DUMP" ] || { echo "ERROR: --dump is required" >&2; exit 2; }
[ -f "$DUMP" ] || { echo "ERROR: no such dump: $DUMP" >&2; exit 2; }

SCRATCH_CONTAINER="artverse-restore-drill"
SCRATCH_PASSWORD="restoredrill"
COUNT_SQL="SELECT 'users' AS table, count(*) FROM users
UNION ALL SELECT 'artists', count(*) FROM artists
UNION ALL SELECT 'artworks', count(*) FROM artworks
UNION ALL SELECT 'orders', count(*) FROM orders
UNION ALL SELECT 'auctions', count(*) FROM auctions
UNION ALL SELECT 'bids', count(*) FROM bids;"

echo "=== Verifying dump is readable ==="
docker run --rm -i postgres:16-alpine pg_restore --list > /dev/null < "$DUMP"
echo "OK: $DUMP ($(du -h "$DUMP" | cut -f1))"

case "$TARGET" in
  scratch)
    echo "=== Starting throwaway postgres container ==="
    docker rm -f "$SCRATCH_CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$SCRATCH_CONTAINER" \
      -e POSTGRES_PASSWORD="$SCRATCH_PASSWORD" \
      -e POSTGRES_USER=artverse \
      -e POSTGRES_DB=artverse_restore_drill \
      postgres:16-alpine >/dev/null

    for i in $(seq 1 30); do
      if docker exec "$SCRATCH_CONTAINER" pg_isready -U artverse -d artverse_restore_drill >/dev/null 2>&1; then
        break
      fi
      [ "$i" = "30" ] && { echo "ERROR: scratch container never became ready" >&2; exit 1; }
      sleep 1
    done

    echo "=== Restoring ==="
    docker exec -i "$SCRATCH_CONTAINER" \
      pg_restore -U artverse -d artverse_restore_drill --no-owner --no-privileges < "$DUMP"

    echo "=== Row counts ==="
    docker exec -i "$SCRATCH_CONTAINER" \
      psql -U artverse -d artverse_restore_drill -c "$COUNT_SQL"

    echo
    echo "Drill complete. Inspect further with:"
    echo "  docker exec -it $SCRATCH_CONTAINER psql -U artverse -d artverse_restore_drill"
    echo "Then clean up with:"
    echo "  docker rm -f $SCRATCH_CONTAINER"
    ;;

  staging|production)
    if [ "$TARGET" = "production" ] && [ -z "$CONFIRMED" ]; then
      echo "ERROR: restoring to production requires --i-mean-it" >&2
      exit 1
    fi
    DB_NAME="artverse_${TARGET}"
    echo
    echo "############################################################"
    echo "#  DESTRUCTIVE: this DROPS AND REPLACES every table in"
    echo "#  $DB_NAME on $TARGET with the contents of"
    echo "#  $DUMP"
    echo "#  (dumped $(date -u -r "$DUMP" +'%Y-%m-%d %H:%M UTC'))"
    echo "############################################################"
    echo
    printf 'Type the database name (%s) to proceed: ' "$DB_NAME"
    read -r reply
    [ "$reply" = "$DB_NAME" ] || { echo "Aborted."; exit 1; }

    echo "=== Stopping app container (prevents writes mid-restore) ==="
    ssh "$TARGET" "cd ~/app && docker compose stop app"

    echo "=== Restoring into $DB_NAME ==="
    ssh "$TARGET" "cd ~/app && docker compose exec -T db pg_restore -U artverse -d $DB_NAME \
      --clean --if-exists --no-owner --no-privileges" < "$DUMP"

    echo "=== Restarting app ==="
    ssh "$TARGET" "cd ~/app && docker compose start app"

    echo "=== Row counts ==="
    ssh "$TARGET" "cd ~/app && docker compose exec -T db psql -U artverse -d $DB_NAME -c \"$COUNT_SQL\""
    ;;

  *)
    echo "ERROR: unknown target '$TARGET' (expected scratch, staging or production)" >&2
    exit 2
    ;;
esac
