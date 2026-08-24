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
# Postgres runs in Docker (postgres:16-alpine); the host has no pg tools, so
# everything goes through `docker exec`.
set -euo pipefail

BACKUP_DIR=/var/backups/datapit
ENV_FILE=/var/www/datapit.io/app/backend/.env
KEEP_DAYS=14

PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -m1 postgres || true)
if [ -z "$PG_CONTAINER" ]; then
  echo "ERROR: no running postgres container found" >&2
  exit 1
fi

DB_URL=$(grep -oP '(?<=^DATABASE_URL=).*' "$ENV_FILE")
DB_USER=$(sed -E 's#^postgres(ql)?://([^:]+):.*#\2#' <<<"$DB_URL")
DB_NAME=$(sed -E 's#.*/([^/?]+)(\?.*)?$#\1#' <<<"$DB_URL")

STAMP=$(date -u +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

OUT="$BACKUP_DIR/pg-$DB_NAME-$STAMP.dump"
docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "$OUT"
chmod 600 "$OUT"

# Sanity: a valid dump lists its tables; an empty/corrupt one doesn't.
TABLES=$(docker exec -i "$PG_CONTAINER" pg_restore -l < "$OUT" | grep -c 'TABLE DATA' || true)
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
