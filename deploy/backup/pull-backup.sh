#!/usr/bin/env bash
# =============================================================================
# ArtVerse cross-VPS backup — pull side (#682)
#
# Runs on the DEV VPS and pulls from production/staging over the `ssh production`
# and `ssh staging` aliases. Pull, not push: production holds no credentials for
# this box and cannot delete the backup history.
#
# Usage: pull-backup.sh db|uploads|all
#   db       — 12-hourly: production + staging database dumps
#   uploads  — daily: production uploads volume, hardlink-snapshotted
#   all      — both (used for manual runs and restore drills)
#
# Install: copy to ~/bin/artverse-backup.sh — do NOT run from the repo working
# tree, which changes branch under the `resume` workflow (see MULTI-DEVICE.md).
# Config overrides + Telegram credentials: ~/.config/artverse-backup.env
# =============================================================================
set -euo pipefail

MODE="${1:?Usage: pull-backup.sh db|uploads|all}"

CONFIG_FILE="${ARTVERSE_BACKUP_CONFIG:-$HOME/.config/artverse-backup.env}"
# shellcheck source=/dev/null
[ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups}"
MIN_FREE_GB="${MIN_FREE_GB:-5}"
# Retention — measured 2026-09-10: prod DB 8.8 MB, uploads 137 MB, 22 GB free.
KEEP_ALL_DAYS="${KEEP_ALL_DAYS:-30}"     # keep every dump this recent
KEEP_WEEKS="${KEEP_WEEKS:-12}"           # then newest per ISO week
KEEP_MONTHS="${KEEP_MONTHS:-12}"         # then newest per month
KEEP_UPLOAD_SNAPSHOTS="${KEEP_UPLOAD_SNAPSHOTS:-30}"
KEEP_STAGING_DUMPS="${KEEP_STAGING_DUMPS:-7}"
# Off-box hook — unset today; set to an rclone remote to also ship off-provider.
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_PREFIX="[artverse-backup $TS]"

log() { echo "$LOG_PREFIX $*"; }

# --- failure path: Telegram on failure only -----------------------------------
notify_failure() {
  local msg="$1"
  log "FAILED: $msg"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -m 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d parse_mode="HTML" \
      -d disable_web_page_preview="true" \
      -d text="@racu8_bot
❌ <b>ArtVerse backup failed</b> (mode: ${MODE})
${msg}
Host: $(hostname) — $(date -u +'%Y-%m-%d %H:%M UTC')" >/dev/null || true
  else
    log "No TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID in $CONFIG_FILE; skipping alert."
  fi
}

fail() { notify_failure "$1"; exit 1; }
trap 'fail "unexpected error at line $LINENO"' ERR

# --- guards -------------------------------------------------------------------
check_free_space() {
  local free_gb
  free_gb=$(df -BG --output=avail "$BACKUP_ROOT" | tail -1 | tr -dc '0-9')
  if [ "$free_gb" -lt "$MIN_FREE_GB" ]; then
    fail "only ${free_gb}GB free on $(df --output=target "$BACKUP_ROOT" | tail -1), need ${MIN_FREE_GB}GB — refusing to fill the disk"
  fi
  log "free space OK: ${free_gb}GB"
}

# --- database dumps -----------------------------------------------------------
# A dropped SSH stream leaves a truncated dump that only fails at restore time,
# so every dump is parsed back with `pg_restore --list` before it is kept.
dump_db() {
  local host="$1" dbname="$2" outdir="$3"
  mkdir -p "$outdir"
  local out="$outdir/$TS.dump"

  log "dumping $dbname from $host"
  if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$host" \
      "cd ~/app && docker compose exec -T db pg_dump -U artverse -Fc $dbname" > "$out"; then
    rm -f "$out"
    fail "pg_dump of $dbname on $host failed"
  fi

  if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$host" \
      "cd ~/app && docker compose exec -T db pg_restore --list" > /dev/null < "$out"; then
    rm -f "$out"
    fail "$dbname dump from $host is truncated or unreadable — discarded"
  fi

  log "$dbname OK: $out ($(du -h "$out" | cut -f1))"
}

# --- uploads volume: full transfer, deduplicated storage ----------------------
# rsync replaces changed files by rename, so existing hardlink snapshots keep
# their old content. Never add --inplace here: it would rewrite them in place.
pull_uploads() {
  local host="$1" volume="$2" base="$3"
  local incoming="$base/incoming" current="$base/current" snapdir="$base/snapshots"
  mkdir -p "$current" "$snapdir"
  rm -rf "$incoming"
  mkdir -p "$incoming"

  log "pulling $volume from $host"
  if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$host" \
      "docker run --rm -v ${volume}:/data alpine tar -cf - -C /data ." | tar -xf - -C "$incoming"; then
    rm -rf "$incoming"
    fail "uploads transfer from $host failed"
  fi

  local count
  count=$(find "$incoming" -type f | wc -l)
  if [ "$count" -eq 0 ]; then
    rm -rf "$incoming"
    fail "uploads transfer from $host produced 0 files — refusing to overwrite the mirror"
  fi

  rsync -a --delete "$incoming/" "$current/"
  rm -rf "$incoming"
  cp -al "$current" "$snapdir/$TS"
  log "uploads OK: $count files, snapshot $snapdir/$TS ($(du -sh "$current" | cut -f1) live)"
}

# --- retention ----------------------------------------------------------------
# Grandfather-father-son: everything recent, then one per week, then one per
# month. Buckets come from mtime, which is the moment the dump was written.
prune_gfs() {
  local dir="$1"
  [ -d "$dir" ] || return 0
  local now week_cut month_cut
  now=$(date -u +%s)
  week_cut=$(( KEEP_ALL_DAYS * 86400 ))
  month_cut=$(( week_cut + KEEP_WEEKS * 7 * 86400 ))
  local oldest=$(( month_cut + KEEP_MONTHS * 31 * 86400 ))

  declare -A seen_week=() seen_month=()
  local f ts age bucket
  while IFS= read -r f; do
    ts=$(stat -c %Y "$f")
    age=$(( now - ts ))
    if   [ "$age" -lt "$week_cut" ]; then
      continue                                    # tier 1: keep all
    elif [ "$age" -lt "$month_cut" ]; then
      bucket="w$(date -u -d "@$ts" +%G-%V)"       # tier 2: newest per ISO week
      if [ -z "${seen_week[$bucket]:-}" ]; then seen_week[$bucket]=1; continue; fi
    elif [ "$age" -lt "$oldest" ]; then
      bucket="m$(date -u -d "@$ts" +%Y-%m)"       # tier 3: newest per month
      if [ -z "${seen_month[$bucket]:-}" ]; then seen_month[$bucket]=1; continue; fi
    fi
    log "pruning $(basename "$f")"
    rm -f "$f"
  done < <(find "$dir" -maxdepth 1 -name '*.dump' -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)
}

prune_count() {
  local dir="$1" keep="$2" findtype="$3"
  [ -d "$dir" ] || return 0
  local victim
  while IFS= read -r victim; do
    log "pruning $(basename "$victim")"
    rm -rf "$victim"
  done < <(find "$dir" -maxdepth 1 -mindepth 1 -type "$findtype" -printf '%T@ %p\n' | sort -rn | tail -n "+$((keep + 1))" | cut -d' ' -f2-)
}

# --- optional off-box sync (deferred — see #682) ------------------------------
sync_offbox() {
  [ -n "$BACKUP_REMOTE" ] || return 0
  command -v rclone >/dev/null || fail "BACKUP_REMOTE is set but rclone is not installed"
  log "syncing to $BACKUP_REMOTE"
  rclone sync "$BACKUP_ROOT/prod" "$BACKUP_REMOTE" || fail "rclone sync to $BACKUP_REMOTE failed"
}

# --- main ---------------------------------------------------------------------
mkdir -p "$BACKUP_ROOT"
check_free_space

case "$MODE" in
  db)
    dump_db production artverse_production "$BACKUP_ROOT/prod/db"
    dump_db staging    artverse_staging    "$BACKUP_ROOT/staging/db"
    prune_gfs "$BACKUP_ROOT/prod/db"
    prune_count "$BACKUP_ROOT/staging/db" "$KEEP_STAGING_DUMPS" f
    ;;
  uploads)
    pull_uploads production artverse-production_uploads "$BACKUP_ROOT/prod/uploads"
    prune_count "$BACKUP_ROOT/prod/uploads/snapshots" "$KEEP_UPLOAD_SNAPSHOTS" d
    ;;
  all)
    "$0" db
    "$0" uploads
    exit 0
    ;;
  *)
    echo "Usage: pull-backup.sh db|uploads|all" >&2
    exit 2
    ;;
esac

sync_offbox
log "done (mode: $MODE)"
