# Operational Runbook

Procedures for the alerts and failure modes this codebase can actually produce.
Written against the services in `backend/src/jobs/` and `backend/src/services/` —
update this file when those change, not the other way around.

---

## Observability surfaces

- **`GET /metrics`** — Prometheus text format (`backend/src/config/metrics.js`).
  Request duration/count by route template, active credit reservations
  (`credit_reservations_pending`), and per-queue BullMQ backlog
  (`bullmq_queue_waiting_jobs`). No app-level auth — on datapit.io, nginx
  restricts `/metrics` to `127.0.0.1` (`allow 127.0.0.1; deny all;` in
  `/etc/nginx/sites-available/datapit.io`), so it's reachable from the box
  itself (e.g. a local Prometheus) but returns 403 from the public internet.
- **`GET /health`** / **`GET /health/ready`** — liveness/readiness
  (`backend/src/routes/health.js`), publicly reachable through nginx.
  `/health` never checks dependencies; `/health/ready` checks Postgres,
  Redis, and Elasticsearch and returns 503 if any is down.
- **Traces** — OpenTelemetry, auto-instrumented (HTTP, Express, Prisma,
  ioredis) via `backend/src/tracing.js`, preloaded with `node --import`
  ahead of the app itself so instrumentation can patch modules before
  they're first used. Spans print to the console by default; set
  `OTEL_EXPORTER_OTLP_ENDPOINT` to ship them to a real collector (Jaeger,
  Tempo, Honeycomb, ...) instead — no code change needed. The `fs`
  instrumentation is deliberately disabled (traces every file read,
  including Node's own module resolution — hundreds of thousands of
  zero-value spans at startup otherwise).

---

## Credit balance drift (`credit-reconciliation` logs `error`)

**Symptom:** `reconciliationService.js` logs `"Credit balance drift detected"` with a
workspace id, expected/actual balances, and a drift amount.

**What it means:** Redis's view of a workspace's credits (available + actively
reserved) no longer matches Postgres's ledger truth. This should be
structurally impossible given the reserve → commit/release flow in
`creditService.js` — treat it as a bug, not routine noise.

**Triage:**
1. Pull the workspace's ledger: `SELECT * FROM "CreditLedgerEntry" WHERE "workspaceId" = '...' ORDER BY "createdAt"`.
2. Check for orphaned reservations: `ZRANGE credits:reservations:pending 0 -1` in
   Redis, cross-referenced against `credits:reservation:<id>` keys.
3. Common causes, in order of likelihood:
   - The `credit-reaper` worker was down for longer than the reservation's
     safety buffer (`RESERVATION_TTL_SECONDS + REAPER_SAFETY_BUFFER_SECONDS`,
     currently 7 minutes) — a reservation's Redis key expired before the
     reaper refunded it. Check worker uptime/logs around the drift window.
   - A deploy restarted the worker mid-reveal, between
     `resolveReservationForCommit` (Redis cleared) and the Postgres
     transaction committing.
4. **Do not manually edit the Redis balance key to "fix" the number.** Insert a
   `CreditLedgerEntry` with `reason: ADJUSTMENT` and a comment explaining why,
   then let the next reconciliation tick confirm it converged. The ledger is
   the source of truth; Redis is a cache of it.

---

## Sequence queue backlog (`sequence-tick` processing more than expected)

**Symptom:** Emails going out later than their `nextStepDueAt`, or
`processDueEnrollments` logs show growing `processed` counts each tick.

**Triage:**
1. Check the worker process is actually running — `sequence-tick` is a
   60-second repeatable BullMQ job; if the worker is down, due enrollments
   just pile up silently (no error, no alert) until it comes back.
2. If the worker is up but falling behind: check Postgres query time on
   `SequenceEnrollment` — the due-query is `WHERE status = 'ACTIVE' AND
   "nextStepDueAt" <= now()`, indexed on `nextStepDueAt` (see
   `schema.prisma`). A missing/corrupted index here is the usual cause of a
   slow-down that wasn't present at launch.
3. `espService.js` is currently a simulated stub with no real network call —
   in production, once a real ESP is wired in, add per-send timeout handling
   here; a hanging provider call would stall the whole tick.

---

## Elasticsearch out of sync with Postgres

**Symptom:** Search results missing a company/contact that definitely exists
in Postgres, or showing stale facet values after an update.

**Fix:** Run the full backfill — it's idempotent and safe to run anytime:

```bash
cd backend
npm run reindex
```

For a single record instead of a full backfill, the `es-index` BullMQ queue
picks up individual `enqueueIndex('contact' | 'company', id)` calls — check
whether the write path that changed the record actually calls
`enqueueIndex` (searchService/revealService/privacyService already do; a new
write path you add will not, unless you add the call).

**If ES itself is down:** `/health/ready` will report `elasticsearch: false`
and return 503 — that's the signal to pull instances out of rotation. Search
endpoints will 5xx; the rest of the API (auth, credits, sequences) keeps
working since ES isn't in those paths.

---

## Refresh token replay detected (users unexpectedly logged out)

**Symptom:** `tokenService.js` throws `ReplayDetectedError`, users see a
"session revoked" 401 and have to log in again.

**What it means:** A refresh token that had already been rotated away got
reused. Two causes, very different severity:
- **Benign:** a client retried a `/auth/refresh` call (e.g. two browser tabs
  both trying to refresh at once, or a flaky network causing a client-side
  retry) — the loser of the race legitimately looks like a replay.
- **Concerning:** a stolen refresh token being used after the legitimate
  client already rotated past it.

**Triage:** This is rare enough in normal operation that a spike is the
signal to look closer — check whether the affected users share an IP
range/pattern suggestive of credential theft rather than normal client
retries. There's no per-event way to distinguish the two cases after the
fact; the design intentionally kills the whole session in both, since the
cost of a false positive (re-login) is much lower than the cost of not
reacting to a real one.

---

## Stripe webhook failures

**Symptom:** Stripe dashboard shows failed webhook deliveries to
`/api/v1/webhooks/stripe`.

**Triage:**
1. `400` responses mean signature verification failed
   (`stripeService.verifyAndParseEvent`) — almost always
   `STRIPE_WEBHOOK_SECRET` mismatched between the deployed environment and
   the Stripe dashboard's configured endpoint secret (each endpoint has its
   own secret; a shared one across staging/prod is a common misconfiguration).
2. `5xx` responses: check `topUpCredits`/`updateSubscriptionState` logs —
   `topUpCredits` logs an explicit error if `checkout.session.completed`
   metadata is missing `workspaceId`/`credits`, which means the checkout
   session was created without that metadata (see `createCheckoutSession` —
   once real Stripe integration replaces the stub, this metadata must be
   set on session creation or top-ups silently no-op).
3. Stripe retries failed webhooks on its own schedule for ~3 days — the
   event-id dedup (`stripe:event:<id>` in Redis, 30-day TTL) means it's safe
   to just fix the bug and let Stripe's retries catch up; no manual replay
   needed as long as the fix ships within Stripe's retry window.

---

## Rate limit false positives

**Symptom:** A legitimate user/IP getting `429`s.

Buckets are `ratelimit:<prefix>:<key>` in Redis with a TTL matching the
window (see `rateLimitService.js`). To manually clear one:

```
redis-cli DEL ratelimit:login:<ip>
redis-cli DEL ratelimit:reveal:<workspaceId>
```

Current limits (`backend/src/routes/*.js`): login 10/min/IP, register
5/hour/IP, reveal 30/min/workspace, privacy opt-out 5/hour/IP. If a limit is
routinely too tight for real usage, that's a signal to change the constant,
not to keep manually clearing the bucket.

---

## GDPR/CCPA erasure requests

Handled at `POST /api/v1/privacy/opt-out` — see `privacyService.js`. This is
unauthenticated by design (a data subject may not have an account), so
verify identity out-of-band before triggering it on someone's behalf via
support tooling. It redacts existing matching `Contact` rows immediately and
registers the email so future pattern-guessed reveals are blocked
(`revealService.js` checks `isOptedOut` before persisting a new guess) — it
does not retroactively un-send anything already delivered through Sequences.

## Production smoke test (`backend/scripts/prod-e2e.mjs`)

Run after any deploy for an end-to-end check of the live API:

```
cd /var/www/datapit.io/app/backend && node scripts/prod-e2e.mjs
```

It exercises signup → email-verify → login, search + masking, a reveal
(against its own throwaway contact — shared data is never mutated), lists,
saved searches, the onboarding checklist + rewards, plan gating, tickets,
the full invite → accept → members flow, forgot → reset password, and the
privacy opt-out, printing one ok/FAIL line per check and exiting non-zero
on any failure. Every account/row it creates (all under `@dp-e2e.test` /
`dp-e2e-*.example`) is deleted in a cleanup pass at the end. Sends to the
probe addresses will bounce (the `.test` TLD isn't routable) — harmless;
notification failures are non-fatal by design.

## Backups & restore (`deploy/backup.sh`)

Nightly at **03:17 UTC** (`datapit-backup.timer`, `Persistent=true`), kept
**14 days** in `/var/backups/datapit/` (root-only):

- `pg-<db>-<stamp>.dump` — `pg_dump -Fc` of the production database, taken
  through `docker exec` (Postgres runs in the `…-postgres-1` container; the
  host has no pg tools). Sanity-checked with `pg_restore -l` before the run
  reports success.
- `env-<stamp>.bak` — a copy of `backend/.env`. **Not optional**: it holds
  `SETTINGS_ENCRYPTION_KEY`, without which the encrypted Stripe credentials
  inside the dump can never be decrypted again.

Run one now / check status:

```
systemctl start datapit-backup.service && journalctl -u datapit-backup -n 5
systemctl list-timers | grep datapit
```

**Restore** (to a scratch DB first — never straight over production):

```
C=$(docker ps --format '{{.Names}}' | grep -m1 postgres)
docker exec $C createdb -U titans7 restore_test
docker exec -i $C pg_restore -U titans7 -d restore_test --no-owner < /var/backups/datapit/pg-….dump
docker exec $C psql -U titans7 -d restore_test -c '\dt'   # eyeball, then point a scratch env at it
# to actually swap: stop pm2 apps, rename DBs (ALTER DATABASE … RENAME), start, reindex ES
docker exec $C dropdb -U titans7 restore_test
```

After any restore: `npm run reindex` (ES) — Redis balances converge from the
ledger via the reconciliation job, but a mass drift alert on the first cycle
is expected.

These backups live **on the same VPS** — they cover `DROP TABLE`, bad
migrations and fat fingers, not the machine burning down. For that, enable
Hostinger's VPS snapshots or ship the dumps offsite (S3/B2 + rclone) — needs
credentials, so it's a user decision.

## Monitoring (`deploy/healthwatch.sh` + Prometheus)

**Watchdog** — `datapit-healthwatch.timer`, every 5 minutes: readiness probe
(`/health/ready` = API + Postgres + Redis + ES), api/worker processes, root
disk < 85%, newest backup < 26h. Alerts by email (Resend, to
`help.datapit@gmail.com` — override with `ALERT_TO=`) — one email on break,
hourly reminders while broken, one on recovery. State in
`/var/lib/datapit/healthwatch.state`. Test the mail path:
`datapit-healthwatch.sh --test`.

**Prometheus** — the `prometheus` package scrapes the API's `/metrics` every
15s (job `datapit-api`, see `deploy/prometheus-datapit.yml`), 30-day
retention, UI bound to `127.0.0.1:9090` only:

```
ssh -L 9090:127.0.0.1:9090 root@datapit.io   →   http://localhost:9090
```

Start with `rate(http_requests_total[5m])`, `credit_reservations_pending`,
`bullmq_queue_waiting_jobs`.

**Redis durability** — the redis container now runs with `--appendonly yes`
(AOF, everysec) on its persistent volume; before 2026-08-24 it was
RDB-snapshot-only (up to ~1h of credit-balance drift on a hard crash). The
compose file is `/var/www/datapit.io/docker-compose.yml` (it moved with the
domain migration) and pins `name: titans7-signalbase` explicitly — never
remove that line: the project name anchors the data volume names
(`titans7-signalbase_postgres_data` etc.), and losing it would point a
`docker compose up` at fresh, empty volumes.

