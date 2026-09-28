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
the full invite → accept → members flow, the Chrome-extension surface
(API-key mint → observe found/title-change/not-found → 4-credit reveal →
key revoke, with its LostChild/MissingPerson queue rows verified and
cleaned), forgot → reset password, and the
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


## Search: prerendered pages, nginx, sitemap (`deploy/nginx/datapit.io.conf`)

`npm run build` in `frontend/` now does three things: the client build, an SSR
build of `src/prerender/entry-server.jsx`, and `scripts/prerender.mjs`, which
writes `dist/index.html`, `dist/<page>.html` for each public page,
`dist/404.html`, `dist/app.html` (the noindex shell for `/app`, `/control`
and the auth screens) and `dist/sitemap.xml`. Titles, descriptions,
canonicals, Open Graph tags and JSON-LD all come from `src/seo/site.js` —
add a new public page there and in `entry-server.jsx`, and add its path to
the `.html` redirect list in the nginx config.

nginx serves those files directly (no SPA fallback any more): unknown URLs get
`404.html` with a real 404 status, and `www.datapit.io` 301s to
`datapit.io`. The tracked copy is `deploy/nginx/datapit.io.conf`; to change
it:

```
cp /etc/nginx/sites-available/datapit.io /root/datapit.io.nginx.bak
cp /var/www/datapit.io/app/deploy/nginx/datapit.io.conf /etc/nginx/sites-available/datapit.io
nginx -t && systemctl reload nginx     # on failure: restore the .bak
```

The same build writes `dist/llms.txt` and `dist/llms-full.txt` (summaries for
AI assistants, from `src/seo/llms.js`). They, the pages' FAQ sections, their
FAQPage structured data and the About page's "At a glance" list all come from
`src/data/facts.js`, `src/data/faqs.js` and `src/data/plans.js` — change a
price or a product fact there, never in page copy. Bump `PRICING_UPDATED_AT`
in `plans.js` with any pricing change; it's the Pricing page's visible
"Prices last updated" date.

Crawler health, once a month on the VPS:
`/var/www/datapit.io/app/deploy/ai-crawlers.sh` counts requests and status
codes per search/AI crawler from `/var/log/nginx/datapit.io.access.log*`
(that log started 2026-09-28). Public pages should only ever show 200, 301 or
304; anything else means a crawler is being turned away. `SINCE=YYYY-MM-DD`
limits it to recent days; the weekly SEO report below includes the last 7.

**Content pages** (comparisons, features, personas, the extension page, free
tools, guides) are plain data files under `frontend/src/content/pages/`
(format: `src/content/schema.js`). `npm run content` indexes them into
`src/content/registry.generated.js` — the build runs it too, and a test fails
if the committed registry is stale. A page with `published: false` still
renders at its URL but is noindex and off the sitemap and llms.txt.

**What's live** — `LIVE` in `src/data/facts.js` records which capabilities
production really has (full database import, email verification, sequence
sending, phone data). Pages and FAQs read these flags, and pages built around
an off capability are hidden. When you set `EMAIL_VERIFIER_API_KEY`, or
`ESP_API_KEY` plus a verified sender, or the big import lands: flip the flag,
set `DATABASE_CLAIM` for the import, rebuild and deploy. Competitor figures
live in the page files (with sources) and `src/data/competitors.js`; re-check
them at least quarterly.

**Build on the server with `npm run build:prod`** (not `npm run build`): it
sets `PRERENDER_API_URL=http://127.0.0.1:4000` so the prerender can fetch
`/api/v1/public/email-formats` and write a page per company with at least 5
addresses. The API must be running during the build; without it the build
still succeeds and just skips those pages.

**Public tools API** (`backend/src/routes/publicTools.js`, no auth, under
`/api/v1/public`): the email verifier (DNS checks only, 20/hour per IP), the
email finder (masked results, 10/day per IP) and email-format aggregates
(cached 1 hour in Redis). Rate limits key on the client IP that nginx
forwards; `trust proxy` only trusts loopback/private hops.

After a deploy that changes marketing copy, ping IndexNow (Bing, and so
ChatGPT search and Copilot) from `frontend/`: `npm run indexnow`. Share
images live in `frontend/public/og/`; regenerate them with
`npm run og-images` (needs local Chrome or Edge) when a page headline changes.

**Press kit** (`/press`): the logo PNGs and the two gallery images in
`frontend/public/press/` are committed; regenerate them with
`npm run press-assets` (local Chrome or Edge) after a logo, price or credit
cost changes. DataPit's own profiles on other sites (LinkedIn, Crunchbase,
G2, Product Hunt, X) go in `PROFILES` in `frontend/src/data/facts.js`; one
entry adds it to the Organization `sameAs`, the /press Profiles section and
llms.txt on the next build.

## Weekly SEO report (`deploy/seo-report.sh`)

`datapit-seo-report.timer`, **Mondays 07:00** server time (`Persistent=true`,
so a missed Monday runs at next boot). Emails one report through Resend, to
`help.datapit@gmail.com` (override with `ALERT_TO=`, comma-separated for
several), subject `datapit.io SEO weekly: N issues` or `… all clear`:

- every `<loc>` in `sitemap.xml`: 200 with no redirect, canonical pointing at
  itself, not noindex (meta or `X-Robots-Tag`), a `<title>` that exists, is
  unique and is at most 60 characters. Every page's status, response time,
  title, robots and canonical are in the attached CSV.
- `robots.txt` (and its `Sitemap:` line), `llms.txt` and `llms-full.txt`
  (200, `text/plain`, non-empty), `www` → bare domain and `http` → `https`
  (301, one hop), `/pricing/` and `/pricing.html` → `/pricing`, and a real
  404 for a made-up URL.
- stale competitor facts: the visible "Last updated" date on `/alternatives/`
  and `/compare/` pages, and the competitor-prices "Checked" date on
  `/pricing`, older than 90 days (`STALE_DAYS=`). Re-check the figures, then
  bump `meta.updated` in the page file or `COMPETITOR_PRICES_CHECKED` in
  `src/data/competitors.js`. Dates within 14 days of going stale are listed
  as "due soon".
- the `ai-crawlers.sh` summary for the last 7 days (`SINCE=`); a crawler
  getting 403, 429 or 5xx on a public page is also listed as an issue.

Install (the unit runs the copy in `/usr/local/bin`, so re-run the `install`
line after changing the script; it finds `ai-crawlers.sh` in the repo):

```
cd /var/www/datapit.io/app
install -m 755 deploy/seo-report.sh /usr/local/bin/datapit-seo-report.sh
cp deploy/systemd/datapit-seo-report.service deploy/systemd/datapit-seo-report.timer /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now datapit-seo-report.timer
```

Test / run now / check:

```
datapit-seo-report.sh --test          # print the report, send nothing (--dry-run is the same)
datapit-seo-report.sh --test --html > /tmp/seo.html   # the email as it will look
systemctl start datapit-seo-report.service && journalctl -u datapit-seo-report -n 30   # sends it
systemctl list-timers datapit-seo-report.timer
```

Disable:

```
systemctl disable --now datapit-seo-report.timer
```

The unit only fails when the report couldn't be mailed (no `RESEND_API_KEY`
in `backend/.env`, or Resend refused it); issues in the report itself leave
it green. `--test`, `--dry-run` and `--html` never send anything. Page checks
stop after 18 minutes (`PAGE_BUDGET=` seconds) so a slow site still gets its
report inside the unit's 30-minute limit; the pages left over show up as a
"not checked" issue.
