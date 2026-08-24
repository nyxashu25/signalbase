#!/usr/bin/env bash
# datapit.io health watchdog — installed as /usr/local/bin/datapit-healthwatch.sh,
# run every 5 minutes by datapit-healthwatch.timer. See RUNBOOK.md "Monitoring".
#
# Checks, in order of blast radius:
#   1. https://datapit.io/health/ready  (Postgres + Redis + Elasticsearch via the API)
#   2. the API and worker processes are alive (the readiness probe can't see the worker)
#   3. root-disk usage < 85%
#   4. the newest nightly backup is < 26 hours old
#
# Alerting is edge-triggered with an hourly reminder: one email when something
# first breaks, another each hour it stays broken, and one on recovery — via
# the same Resend account the app itself sends with (key read from backend/.env).
#
#   datapit-healthwatch.sh --test   sends a test email and exits.
set -uo pipefail

ENV_FILE=/var/www/datapit.io/app/backend/.env
STATE_DIR=/var/lib/datapit
STATE_FILE="$STATE_DIR/healthwatch.state"
ALERT_TO="${ALERT_TO:-help.datapit@gmail.com}"
SITE="${SITE:-https://datapit.io}"
REMIND_SECONDS=3600

mkdir -p "$STATE_DIR"

RESEND_API_KEY=$(grep -oP '(?<=^RESEND_API_KEY=).*' "$ENV_FILE" || true)
RESEND_FROM=$(grep -oP '(?<=^RESEND_FROM_EMAIL=).*' "$ENV_FILE" || true)

send_mail() { # $1 subject, $2 html body
  if [ -z "$RESEND_API_KEY" ]; then
    echo "no RESEND_API_KEY — would have mailed: $1"
    return 0
  fi
  curl -fsS -m 15 https://api.resend.com/emails \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(printf '{"from":"%s","to":["%s"],"subject":"%s","html":"%s"}' \
        "${RESEND_FROM:-no-reply@datapit.io}" "$ALERT_TO" "$1" "$2")" >/dev/null \
    && echo "alert mailed: $1" || echo "ERROR: failed to send alert email" >&2
}

if [ "${1:-}" = "--test" ]; then
  send_mail "DataPit healthwatch test" "The watchdog on $(hostname) can send email. Nothing is wrong."
  exit 0
fi

PROBLEMS=()

curl -fsS -m 10 "$SITE/health/ready" >/dev/null 2>&1 \
  || PROBLEMS+=("readiness probe failed: $SITE/health/ready (API down, or Postgres/Redis/Elasticsearch unhealthy)")

pgrep -f 'backend/src/server.js' >/dev/null || PROBLEMS+=("datapit-api process not running (pm2)")
pgrep -f 'backend/src/jobs/worker.js' >/dev/null || PROBLEMS+=("datapit-worker process not running (pm2) — sequences and indexing are stalled")

DISK_PCT=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "${DISK_PCT:-0}" -ge 85 ] && PROBLEMS+=("root disk is ${DISK_PCT}% full")

LATEST_DUMP=$(ls -t /var/backups/datapit/pg-*.dump 2>/dev/null | head -1 || true)
if [ -n "$LATEST_DUMP" ]; then
  AGE_H=$(( ( $(date +%s) - $(stat -c %Y "$LATEST_DUMP") ) / 3600 ))
  [ "$AGE_H" -gt 26 ] && PROBLEMS+=("newest Postgres backup is ${AGE_H}h old (nightly job may be failing)")
else
  PROBLEMS+=("no Postgres backups found in /var/backups/datapit")
fi

NOW=$(date +%s)
PREV_STATUS="UP"
LAST_ALERT=0
[ -f "$STATE_FILE" ] && . "$STATE_FILE" 2>/dev/null || true

if [ "${#PROBLEMS[@]}" -gt 0 ]; then
  BODY="<p><strong>$(hostname) — $(date -u '+%Y-%m-%d %H:%M UTC')</strong></p><ul>"
  for p in "${PROBLEMS[@]}"; do BODY+="<li>${p//\"/}</li>"; done
  BODY+="</ul><p>Runbook: RUNBOOK.md in the repo. Checks run every 5 minutes; this email repeats hourly until resolved.</p>"
  if [ "$PREV_STATUS" = "UP" ] || [ $((NOW - LAST_ALERT)) -ge $REMIND_SECONDS ]; then
    send_mail "[ALERT] DataPit: ${#PROBLEMS[@]} problem(s) on datapit.io" "$BODY"
    LAST_ALERT=$NOW
  fi
  printf 'PREV_STATUS=DOWN\nLAST_ALERT=%s\n' "$LAST_ALERT" > "$STATE_FILE"
  printf '%s\n' "${PROBLEMS[@]}"
  exit 0   # the timer unit itself stays green; the state machine owns escalation
else
  if [ "$PREV_STATUS" = "DOWN" ]; then
    send_mail "[RESOLVED] DataPit is healthy again" "<p>All checks pass on $(hostname) as of $(date -u '+%Y-%m-%d %H:%M UTC').</p>"
  fi
  printf 'PREV_STATUS=UP\nLAST_ALERT=0\n' > "$STATE_FILE"
  echo "all checks ok"
fi
