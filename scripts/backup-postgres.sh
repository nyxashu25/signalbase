#!/usr/bin/env bash
#
# Nightly Postgres backup. Intended to run from a cron job / scheduled task
# runner (e.g. a Kubernetes CronJob, ECS scheduled task, or plain crontab on
# a bastion host) — this script does not schedule itself.
#
# Usage:
#   DATABASE_URL=postgresql://user:pass@host:5432/signalbase \
#   BACKUP_DIR=/var/backups/signalbase \
#   S3_BUCKET=s3://signalbase-backups \
#   ./scripts/backup-postgres.sh
#
# Restore:
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backup-file.dump
#
# S3_BUCKET is optional — omit it to keep backups local-only (fine for a
# single-VM deployment with its own disk snapshots; not fine as your only
# copy in anything more serious).

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILENAME="signalbase-${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Dumping database to ${BACKUP_DIR}/${FILENAME}..."
# -Fc: custom format — compressed, and the only format pg_restore can do
# selective/parallel restores from. Plain SQL dumps are harder to work with
# at any real database size.
pg_dump "$DATABASE_URL" -Fc -f "${BACKUP_DIR}/${FILENAME}"

echo "Backup complete: $(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)"

if [ -n "${S3_BUCKET:-}" ]; then
  echo "Uploading to ${S3_BUCKET}..."
  aws s3 cp "${BACKUP_DIR}/${FILENAME}" "${S3_BUCKET}/${FILENAME}"
fi

echo "Pruning local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name 'signalbase-*.dump' -mtime "+${RETENTION_DAYS}" -delete

echo "Done."
