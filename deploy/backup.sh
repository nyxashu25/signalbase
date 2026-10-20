#!/usr/bin/env bash
# Nightly Postgres backup for datapit.io — installed as /usr/local/bin/datapit-backup.sh,
# run by datapit-backup.timer (03:17 UTC daily). See RUNBOOK.md "Backups & restore".
#
# What it saves and why:
#   - pg_dump -Fc of the production database (custom format: compressed, and
#     restorable table-by-table with pg_restore). Postgres is the source of
#     truth for everything — the Redis balances are derivable from the ledger
#     and Elasticsearch is rebuilt with `npm run reindex`.
#   - backend/.env — it holds SETTINGS_ENCRYPTION_KEY; without that key the
#     encrypted Stripe credentials inside the dump can never be decrypted
#     again, so a dump without the matching .env is not a full backup.
#
# Postgres runs natively on the current host (Postgres 18), so pg_dump talks
# to it with DATABASE_URL. Where Postgres runs in Docker and the host has no
# pg tools (the old 72.62.212.246 setup), it goes through `docker exec`.
set -euo pipefail

BACKUP_DIR=/var/backups/datapit
ENV_FILE=/var/www/datapit.io/app/backend/.env
KEEP_DAYS=14

DB_URL=$(grep -oP '(?<=^DATABASE_URL=).*' "$ENV_FILE")
DB_USER=$(sed -E 's#^postgres(ql)?://([^:]+):.*#\2#' <<<"$DB_URL")
DB_NAME=$(sed -E 's#.*/([^/?]+)(\?.*)?$#\1#' <<<"$DB_URL")

if command -v pg_dump >/dev/null; then
  # libpq rejects Prisma-only URL parameters such as ?schema=, so drop the query.
  pg_dump_cmd() { pg_dump -Fc "${DB_URL%%\?*}"; }
  pg_list_cmd() { pg_restore -l "$1"; }
else
  PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -m1 postgres || true)
  if [ -z "$PG_CONTAINER" ]; then
    echo "ERROR: no pg_dump on this host and no running postgres container" >&2
    exit 1
  fi
  pg_dump_cmd() { docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME"; }
  pg_list_cmd() { docker exec -i "$PG_CONTAINER" pg_restore -l < "$1"; }
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

OUT="$BACKUP_DIR/pg-$DB_NAME-$STAMP.dump"
pg_dump_cmd > "$OUT"
chmod 600 "$OUT"

# Sanity: a valid dump lists its tables; an empty/corrupt one doesn't.
TABLES=$(pg_list_cmd "$OUT" | grep -c 'TABLE DATA' || true)
if [ "${TABLES:-0}" -lt 5 ]; then
  echo "ERROR: dump sanity check failed — only ${TABLES:-0} tables listed in $OUT" >&2
  exit 1
fi

cp "$ENV_FILE" "$BACKUP_DIR/env-$STAMP.bak"
chmod 600 "$BACKUP_DIR/env-$STAMP.bak"

# Rotate: keep KEEP_DAYS days of nightly dumps + env copies.
find "$BACKUP_DIR" -name 'pg-*.dump' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'env-*.bak' -mtime +"$KEEP_DAYS" -delete

echo "backup ok: $OUT ($(du -h "$OUT" | cut -f1), $TABLES table-data entries), env copied, retention ${KEEP_DAYS}d"
