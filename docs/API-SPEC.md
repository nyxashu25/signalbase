# API Spec

Base path for everything below (unless noted): **`/api/v1`**, mounted in `backend/src/app.js`. Every
router lives in `backend/src/routes/*.js` and is wired up in `backend/src/routes/index.js`. This is
the actual route table — verbs, paths, and middleware — read from that code, not aspirational.

Three routes sit **outside** `/api/v1`, mounted directly on the Express app:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness — never checks dependencies. |
| GET | `/health/ready` | Readiness — checks Postgres, Redis, Elasticsearch; 503 if any is down. |
| GET | `/metrics` | Prometheus scrape target. No app-level auth — restricted to `127.0.0.1` by nginx in production (see `RUNBOOK.md`). |

Conventions used in the tables below:
- **Auth**: "—" means no `requireAuth`/`requireSuperAdmin` at all (either public by design, or
  authenticated by a provider's own signature scheme). "User" means a tenant JWT
  (`Authorization: Bearer`) via `requireAuth`. "Super admin" means `requireSuperAdmin`.
- **Credits**: the credit cost reserved via `reserveCredits`/`reserveCompanyViewCredits` middleware
  before the handler runs (`backend/src/config/creditPricing.js`). "—" means free.
- Every credit-gated and the reveal route also runs `releaseOnError`, refunding a reservation if the
  handler throws.

---

## Auth — `/api/v1/auth` (`routes/auth.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/register` | — | 5/hour/IP | Creates org+workspace+user+OWNER membership, **unverified**. Emails a confirm link; does not log in. |
| POST | `/login` | — | 10/min/IP | Rejects if `suspendedAt` set or `emailVerified` false. |
| POST | `/google` | — | 10/min/IP | Google Identity Services ID-token flow. Links to an existing account by verified email, or creates a new one. 503 if `GOOGLE_CLIENT_ID` unset. |
| POST | `/verify-email` | — | — | Body carries the emailed token. Flips `emailVerified`, sends welcome + admin-alert email once, then logs the user in. |
| POST | `/resend-verification` | — | 5/hour/IP (shares the register limiter) | Silently no-ops for an unknown or already-verified email — never reveals which. |
| POST | `/refresh` | — (reads the httpOnly refresh cookie) | — | Rotates the refresh token; re-reads membership so a role change/suspension takes effect immediately. |
| POST | `/logout` | — | — | Revokes the refresh token. |
| GET | `/me` | User | — | Current user/workspace/role. |
| POST | `/tutorial-complete` | User | — | Marks the first-login tour finished (once, permanently). |

## Search — `/api/v1/search` (`routes/search.js`)

All routes require auth.

| Method | Path | Credits | Rate limit | Notes |
|---|---|---|---|---|
| GET | `/saved` | — | — | Workspace's saved searches; `?type=PEOPLE|COMPANIES` to filter. |
| POST | `/saved` | — | 30/hour/workspace | `{ type, name, filters }` — `filters` is the frontend's filter state stored verbatim (≤4KB), replayed client-side. Max 50 per type. |
| DELETE | `/saved/:id` | — | — | 404 (not 403) for another workspace's row. |
| GET | `/companies` | — | — | Faceted Elasticsearch query; hydrated from Postgres. Params: `q`, `industry[]`, `location[]`, `techStack[]`, `headcount[]` (bucket keys `1-10 … 5001+`, matched on `headcountMin`), `sort` (`relevance|name_asc|name_desc|headcount_desc|newest`), `page`, `pageSize`. Facets: `industry`, `location`, `techStack`, `headcount` (range agg, declared bucket order). |
| GET | `/companies/export` | 20 (`CSV_EXPORT`) | 10/min/workspace | Unpaginated, capped at 5000 rows. Same filters as `/companies` minus paging. Must be declared before `/companies/:id`. |
| GET | `/companies/:id` | 20 (`COMPANY_DETAIL_VIEW`), skipped if already viewed | — | `reserveCompanyViewCredits` checks `CompanyDetailView` first — a repeat view by the same workspace is free. |
| GET | `/people` | — | — | Contact search; results run through `attachRevealStatus` (masked unless revealed). Params: `q`, `title` / `company` (prefix-phrase "contains"), `seniority[]`, `department[]`, `industry[]`, `location[]`, `emailStatus[]` (`verified|unverified|not_found`, derived from the indexed `hasEmail`/`emailVerified` booleans), `sort` (`relevance|name_asc|name_desc|newest`), `page`, `pageSize`. Facets: the four term facets + `emailStatus` (filters agg). |
| GET | `/people/export` | 20 (`CSV_EXPORT`) | 10/min/workspace | Same 5000-row cap and filters as `/people`. |

## Contacts (reveal) — `/api/v1/contacts` (`routes/contacts.js`)

| Method | Path | Auth | Credits | Rate limit | Notes |
|---|---|---|---|---|---|
| POST | `/:id/reveal` | User | 2 (`REVEAL`) | 30/min/workspace | Requires `Idempotency-Key` header (cached replay for 24h). `skipIfAlreadyRevealed` short-circuits if the workspace already revealed this contact. Runs pattern-find + optional Hunter.io verify; a confirmed-bad result refunds instead of charging. |

## Lists — `/api/v1/lists` (`routes/lists.js`)

All routes require auth.

| Method | Path | Role | Credits | Rate limit | Notes |
|---|---|---|---|---|---|
| GET | `/` | Member+ | — | — | |
| POST | `/` | Member+ | — | 30/hour/workspace | |
| GET | `/:id` | Member+ | — | — | |
| GET | `/:id/export` | Member+ | 20 (`CSV_EXPORT`) | — | |
| DELETE | `/:id` | Admin+ | — | — | |
| POST | `/:id/items` | Member+ | — | — | |
| DELETE | `/:id/items/:itemId` | Member+ | — | — | |

## Sequences — `/api/v1/sequences` (`routes/sequences.js`)

All routes require auth. `requireSequencesPlan` gates create/activate/enroll to plans where
`PLAN_HAS_SEQUENCES` is true (`BASIC`/`PROFESSIONAL`/`ORGANIZATION` — not `FREE`).

| Method | Path | Credits | Rate limit | Notes |
|---|---|---|---|---|
| GET | `/` | — | — | |
| GET | `/:id` | — | — | |
| GET | `/:id/analytics` | — | — | Enrollment funnel + per-step open/click/reply/bounce rates. |
| POST | `/` | — | 20/hour/workspace | Plan-gated. |
| POST | `/:id/activate` | — | — | Plan-gated. `DRAFT` → `ACTIVE`. |
| POST | `/:id/enrollments` | 250 (`SEQUENCE_ENROLLMENT`) | — | Plan-gated. Sequence must already be `ACTIVE`. |
| POST | `/enrollments/:enrollmentId/pause` | — | — | |
| POST | `/enrollments/:enrollmentId/resume` | — | — | |
| POST | `/enrollments/:enrollmentId/unenroll` | — | — | |

## Billing — `/api/v1/billing` (`routes/billing.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| GET | `/packages` | — | — | The three fixed credit packages (`config/creditPackages.js`). |
| GET | `/credit-costs` | — | — | `CREDIT_COSTS` as JSON, so the UI never hardcodes prices. |
| GET | `/custom-credits-price` | — | — | Prices an arbitrary credit amount (200–50,000) at the nearest package's per-credit rate. |
| GET | `/summary` | User | — | Current plan, balance, renewal info. |
| GET | `/transactions` | User | — | Paginated ledger history for the workspace. |
| POST | `/checkout-session` | User | 10/hour/workspace | One-off credit top-up. Simulated (returns a fake `billing.simulated.local` URL) unless a Stripe secret key is configured via `/control/settings`. |
| POST | `/subscribe` | User | 10/hour/workspace | Recurring plan subscription checkout. Blocks a downgrade while the current paid interval's minimum commitment hasn't elapsed. Same simulate-until-configured behavior as checkout-session. |

## Tickets (tenant side) — `/api/v1/tickets` (`routes/tickets.js`)

All routes require auth.

| Method | Path | Rate limit | Notes |
|---|---|---|---|
| GET | `/subjects` | — | Predefined subject list (`config/ticketConfig.js`). |
| GET | `/` | — | Paginated, filterable by status (`ACTIVE` = `UNANSWERED`+`ANSWERED`, or a literal status). |
| POST | `/` | 10/hour/workspace | Creates a ticket + its opening `TicketMessage`; emails the creator a confirmation. |
| GET | `/:id` | — | Full thread. |
| POST | `/:id/messages` | 30/hour/workspace | User reply; flips ticket back to `UNANSWERED` even if it was `ANSWERED`. 400 if `CLOSED`. |

## Notifications — `/api/v1/notifications` (`routes/notifications.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/unsubscribe` | — | 20/hour/IP | Click-target for the promotional-broadcast unsubscribe link. Token itself is the credential. |

## Privacy — `/api/v1/privacy` (`routes/privacy.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/opt-out` | — | 5/hour/IP | GDPR/CCPA erasure request by email. Unauthenticated by design (a data subject may not have an account). Redacts matching `Contact` rows immediately and registers the email against future guessed reveals. |

## Tools — `/api/v1/tools` (`routes/tools.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/verify-email` | User | 30/hour/workspace | Free (no credit charge) ad-hoc Hunter.io check — still rate-limited since it hits a metered external API. |

## Marketing contact form — `/api/v1/contact` (`routes/contact.js`)

| Method | Path | Auth | Rate limit | Notes |
|---|---|---|---|---|
| POST | `/` | — | 5/hour/IP | Unauthenticated (no account exists yet). Emailed to every super admin as the sales-inbox stand-in — no CRM integration (see `TODO.md`). |

## Webhooks — `/api/v1/webhooks` (`routes/webhooks.js`)

Neither route requires auth — the caller is an external provider, authenticated by its own signature
scheme instead of a session.

| Method | Path | Verified by | Notes |
|---|---|---|---|
| POST | `/esp` | `ESP_WEBHOOK_SECRET` (static env var, `verifyWebhookSignature` middleware) | Sequence-send events (`SENT`/`OPENED`/`CLICKED`/`BOUNCED`/`REPLIED`/`UNSUBSCRIBED`). Correlates back to a step via `providerEventId`. `BOUNCED`/`UNSUBSCRIBED` add a `SuppressionEntry`; `REPLIED` unenrolls. |
| POST | `/stripe` | Stripe's own signature scheme (`stripeService.verifyAndParseEvent`), using the admin-configured (encrypted-in-Postgres) webhook secret — cannot use the shared `verifyWebhookSignature`, which only knows the static `ESP_WEBHOOK_SECRET` | `checkout.session.completed` (top-up or plan activation, branched on `session.mode`), `invoice.paid` (monthly/interval credit grant), `customer.subscription.updated`/`.deleted`. Event-id deduped in Redis for 30 days. |

## Admin (super-admin panel backend) — `/api/v1/admin` (`routes/admin.js`)

Frontend surfaces this at `/control`. Every route except login requires `requireSuperAdmin`.

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | 5/15min/IP — tighter than the tenant login limiter. |
| GET | `/overview` | Workspace/user/paid-workspace counts, new users last 30 days. |
| GET | `/usage` | Total reveals, total sequence sends. |
| GET | `/users` | Paginated, searchable by email/name. |
| GET | `/users/:userId` | Includes live credit balance + lifetime credits used. |
| POST | `/users/:userId/suspend` / `/unsuspend` | Sets/clears `User.suspendedAt`. |
| POST | `/users/:userId/credits` | Grants an arbitrary credit amount (`CreditReason.ADJUSTMENT`); emails the user. |
| PUT | `/users/:userId/plan` | Support-desk plan override — does **not** touch Stripe subscription state. |
| GET | `/billing/overview` | Total `TOPUP` revenue, transaction count, whether a Stripe key is actually configured. |
| GET | `/billing/transactions` | Paginated `TOPUP`/`ADJUSTMENT` ledger entries across all workspaces. |
| GET / PUT | `/settings/stripe` | Read/write the encrypted Stripe secret key + webhook secret. |
| POST | `/promotions` | One-off promotional broadcast to every non-suspended, non-opted-out user. |
| GET | `/audit-log` | Paginated compliance trail of suspend/unsuspend/plan-change/add-credits actions; optional `?userId=` filter. |
| GET | `/database-imports` | List all CSV import batches. |
| GET | `/database-imports/:batchId` | Batch detail incl. per-row errors (capped at 100 stored). |
| POST | `/database-imports` | 10/hour/IP. Multipart CSV upload (`uploadCsv` middleware); enqueues async processing. |
| POST | `/database-imports/:batchId/approve` | Publishes a `PENDING_APPROVAL` batch — clears staging flag, enqueues ES indexing. |
| GET | `/tickets/notifications` | Polled for the live unread-ticket indicator in the admin panel. |
| GET | `/tickets` | Paginated, filterable by status/type, across all workspaces. |
| GET | `/tickets/:id` | Full thread. |
| POST | `/tickets/:id/messages` | Admin reply; flips ticket to `ANSWERED`; emails the ticket's creator. |
| POST | `/tickets/:id/close` | Emails the ticket's creator. |

---

## What's *not* here

No CRM-sync endpoints (Salesforce/HubSpot push), no Chrome-extension-specific endpoints, no
technographics/intent-signal/funding-event endpoints, no password-reset route, no team/seat-invite
route, no Microsoft OAuth route. All explicitly out of scope or open gaps per `TODO.md` — see
`docs/FEATURES.md` for the full built-vs-not-built breakdown.
