# Features

This document separates what's actually implemented end-to-end (backend service + wired-up frontend
page, verified against the code) from what `ARCHITECTURE.md`'s "What the product does" table and
`README.md`'s feature list describe but isn't built. Both those docs sketch a full Apollo/Slintel-
style platform; this file is the honest accounting of the reference implementation that exists today.

---

## Built

Backend evidence is `backend/src/services/*.js` (excluding `.test.js`); frontend evidence is a
matching page under `frontend/src/pages/**/*.jsx` and an RTK Query slice under `frontend/src/api/`.

| Feature | How it works | Key files |
|---|---|---|
| **Auth: password + email verification** | Signup creates an unverified account and emails a confirm link; login rejects an unverified or suspended account. | `authService.js`, `resendService.js`, `pages/Login.jsx`, `pages/VerifyEmail.jsx` |
| **Auth: password reset** | "Forgot password?" on the sign-in page → enumeration-safe emailed link (1h TTL, single-use via a fingerprint of the current password hash) → choose a new password. Google-only accounts can use it to set a first password. | `authService.requestPasswordReset/resetPassword`, `pages/ForgotPassword.jsx`, `pages/ResetPassword.jsx` |
| **Team/seat invites** | Settings → Users & teams: ADMIN+ invites by email with a role (ADMIN/MEMBER); pending invites list with copyable link + revoke; accept page creates an account (new email) or adds the workspace to an existing one; multi-seat users switch workspaces from the account menu. | `WorkspaceInvite` model, `workspaceService.js`, `authService.acceptInvite/switchWorkspace`, `pages/AcceptInvite.jsx`, `pages/settings/SettingsMembers.jsx` |
| **Auth: Google Sign-In** | Google Identity Services ID-token flow; links to an existing account by verified email or creates a new one. | `authService.loginWithGoogle`, `GoogleSignInButton.jsx` |
| **JWT access/refresh** | Short-lived access token (in-memory), httpOnly refresh cookie, rotation with replay detection. | `tokenService.js` |
| **Org → Workspace → User + RBAC** | `OWNER`/`ADMIN`/`MEMBER` roles scoped per workspace; `requireRole` middleware. | `middleware/rbac.js`, `schema.prisma` |
| **Company + people search** | Faceted Elasticsearch queries, hydrated from Postgres, emails masked unless revealed. People: job-title / company "contains", seniority, department, email status (verified / unverified / not found), industry, location, sort. Companies: industry, # employees (buckets), location, tech stack, sort. Accordion filter rail with per-group counts + removable chips, bulk-select with bulk add-to-list / bulk reveal, column picker, page-size pagination. | `searchService.js`, `pages/People.jsx`, `pages/Companies.jsx`, `components/search/*` |
| **Saved searches** | Name and store the current People/Companies filter set per workspace; reapply in one click from the toolbar. | `savedSearchService.js`, `SavedSearch` model, `components/search/SavedSearchesMenu.jsx` |
| **Home: getting-started hub + overview** | Checklist of 10 real tasks in 3 groups, detected from existing data (reveal, list, saved search, sequence, enrollment, company view, tour, email verified — the people search is recorded by its controller); +5 credits per task, +10 per group, 75 max, paid once as `ONBOARDING_REWARD` ledger rows with a success toast; sequence tasks show as plan-locked on Free; next task gets the one primary CTA; completed rows collapse; sidebar progress card hides at 100%. Overview tab: Credits / Reveals this month / Credits used this month / Active sequences / Saved lists tiles + recent activity. Tools tab: the standalone email verifier. Resources strip → in-app Help guide (`/app/help`), credits section, new ticket. Home defaults to Overview once the checklist is complete. | `onboardingService.js`, `config/onboardingConfig.js`, `OnboardingTaskCompletion` model, `pages/Dashboard.jsx`, `components/app/GettingStarted.jsx`, `components/app/OnboardingCard.jsx`, `pages/Help.jsx` |
| **Settings area** | `/app/settings` with Profile (rename), Workspace (rename for ADMIN+, plan summary), Users & teams (seat list; invites honestly marked coming soon), Security (change / first-set password, Google link status), Notifications (marketing opt-out toggle; transactional always-on), Integrations (honest empty state + CSV export / verifier pointers). `/app/profile` redirects here. | `pages/settings/*`, `routes/workspace.js`, `authService.updateProfile/changePassword/updatePreferences` |
| **Designed empty states** | One SVG line illustration per object type (`components/ui/illustrations.jsx`, `currentColor` + one accent) used on Lists, ListDetail, Sequences (+Analytics), Tickets, Billing, People/Companies results, Home activity, Integrations. | `components/ui/illustrations.jsx`, `EmptyState` |
| **App shell (Apollo-benchmarked)** | Grouped, collapsible sidebar with a rail mode and an Upgrade card; ⌘K command palette (pages, actions, live people/company/list/sequence search); credits pill; notification bell (answered-ticket replies); neutral dark/light in-app theme with purple as the single accent; shared `PageHeader`/`Toolbar`/`Banner`/`Toast`/`Tooltip`/`EmptyState`/`StatusPill` primitives. See `docs/UX-ROADMAP.md`. | `layouts/AppLayout.jsx`, `components/app/*`, `components/ui/*` |
| **Credit-gated email + phone reveal** | Reserve → find (deterministic `first.last@domain` pattern) → optional Hunter.io verify → commit/refund. Idempotency-key protected. One reveal also unlocks the contact's phone number (from the dataset — seed/CSV `TelephoneNo`; no phone finder); both are masked (`a****@n****.com`, `+1 415 *** **32`) on every contact-bearing response — search, company detail, list detail — until revealed. | `revealService.js`, `emailFinderService.js`, `emailVerifierService.js`, `creditService.js` |
| **Company detail view (paid, cached per workspace)** | First view charges credits and records `CompanyDetailView`; repeat views by the same workspace are free. | `searchService.getCompanyDetail` |
| **Lists** | Save contacts/companies into named lists; CSV export (credit-gated). A people list's detail view is the same reveal-capable contact table as search (email + phone, copy, add to list, remove). | `listService.js`, `pages/Lists.jsx`, `pages/ListDetail.jsx` |
| **Sequences (multi-step email cadences)** | `EMAIL`/`WAIT` steps, enroll/pause/resume/unenroll, a 60-second BullMQ tick advances due enrollments, funnel + per-step analytics, plus a workspace-wide *Analytics* tab (KPI grid + per-sequence table, `GET /sequences/analytics`). Gated to paid plans. | `sequenceService.js`, `jobs/processors/sequenceProcessor.js`, `pages/SequenceBuilder.jsx`, `pages/SequenceDetail.jsx` |
| **Suppression list** | Workspace-scoped; a `BOUNCED`/`UNSUBSCRIBED` ESP webhook event auto-suppresses future sends to that address. | `suppressionService.js`, `webhookService.js` |
| **Credits & billing: one-off top-ups** | Stripe Checkout (mode `payment`) for fixed or custom credit packages; simulated locally until an admin configures a real Stripe key. | `stripeService.createCheckoutSession`, `pages/AddCredits.jsx` |
| **Credits & billing: recurring plan subscriptions** | Stripe Checkout (mode `subscription`), per-seat/month pricing across 3 billing intervals with a minimum-commitment downgrade lock. | `stripeService.createPlanSubscriptionSession`, `pages/Billing.jsx` |
| **Admin-configurable Stripe keys** | Secret key + webhook secret entered via `/control/settings`, AES-256-GCM encrypted in Postgres — not an env var. | `paymentSettingsService.js`, `pages/admin/AdminSettings.jsx` |
| **Support/sales ticketing (tenant side)** | User creates a ticket, replies to it; status flips `UNANSWERED`⇄`ANSWERED` as each side replies. Tabs carry live per-status counts. | `ticketService.js`, `pages/Tickets.jsx`, `pages/TicketDetail.jsx` |
| **Support/sales ticketing (admin side)** | Separate `/control` panel: reply, close, live polling that notifies on brand-new tickets *and* on a customer replying to an answered thread (`kind: 'reply'`), with a "Customer replied" flag in the list. | `adminTicketController`, `pages/admin/AdminTickets.jsx`, `pages/admin/AdminTicketDetail.jsx` |
| **Transactional email (Resend)** | Verification link, welcome + new-signup admin alert, ticket created/replied/closed, credit purchase receipt, plan activated, admin-granted credits/plan-change, monthly credit renewal, promotional broadcast with per-user unsubscribe link. Simulated (logged) until `RESEND_API_KEY` is set. | `resendService.js`, `notificationService.js` |
| **GDPR/CCPA data-subject opt-out & erasure** | Unauthenticated `POST /privacy/opt-out` immediately redacts matching contacts and registers the email against future guessed reveals. Public form on the marketing Privacy page (§7 "Remove my data") — no account needed. | `privacyService.js`, `pages/marketing/Privacy.jsx` |
| **CSV database-import pipeline with admin approval** | Super admin uploads an RPF-format CSV; rows insert immediately but stay unindexed until explicitly approved. | `databaseImportService.js`, `pages/admin/AdminExtendDatabase.jsx` |
| **Elasticsearch indexing** | Debounced per-entity enqueue (`enqueueIndex`) on every write path that touches search-visible data, plus a full-backfill `npm run reindex`. | `indexerService.js` |
| **Credit-balance reaper + reconciliation** | A repeatable job refunds reservations whose logical TTL passed without commit/release; a separate 15-min job alerts (never auto-corrects) on any Redis/Postgres drift. | `jobs/processors/creditReaperProcessor.js`, `reconciliationService.js` |
| **Rate limiting** | Redis token-bucket limiters on login, register, reveal, exports, admin login, opt-out, unsubscribe, database-import upload, tools/verify-email, the marketing contact form, and (per-workspace) ticket create/reply, sequence create, list create, and billing checkout/subscribe. | `rateLimitService.js`, `middleware/rateLimit.js` |
| **Idempotency keys** | Required header on the reveal endpoint; a repeated key replays the cached response instead of re-spending credits. | `middleware/idempotency.js` |
| **Observability** | Prometheus `/metrics` (request duration/count, pending credit reservations, per-queue BullMQ backlog), structured logs, OpenTelemetry auto-instrumentation. | `config/metrics.js`, `config/logger.js`, `tracing.js` |
| **In-app unread-ticket badge (tenant side)** | Nav badge counts this workspace's `ANSWERED` tickets (support replied, your turn) — polled, no separate read/unread model. | `useAnsweredTicketsBadge.js`, `layouts/AppLayout.jsx` |
| **Marketing contact-form lead forwarding** | No CRM — the submission is emailed to every super admin as the sales-inbox stand-in. | `notificationService.sendContactFormLead`, `contactController.js` |
| **Admin action audit log** | Every suspend/unsuspend/plan-change/add-credits, Stripe-settings save (field names only), import approval and promotional broadcast records which super admin did it, when, and the relevant metadata. Surfaced at `/control/audit-log`. | `AdminAuditLog` model, `adminService.recordAuditLog`, `pages/admin/AdminAuditLog.jsx` |

---

## Not built / explicitly deferred (see `TODO.md`)

These appear in `ARCHITECTURE.md`'s product-pillar table and/or `README.md`'s feature list, but have
**no corresponding model, service, or route** in the current codebase:

| "Feature" as described | Actual status |
|---|---|
| **Technographics** ("what software a company runs, from web scraping + signals") | Not built. `Company.techStack` is a plain `String[]` filled from seed/CSV data — no scraper, no signal provider, no separate model. |
| **Intent / buying-signal scoring** (topic scores, job-change alerts, funding events, hiring spikes) | Not built. No `IntentSignal`, `FundingEvent`, or scoring model/service exists anywhere in `backend/`. |
| **CRM sync (Salesforce/HubSpot)** | Not built. `routes/index.js` explicitly comments this out of scope. Tracked as P2/deferred in `TODO.md`. |
| **Chrome extension** | Not built — no extension project in this repo. Tracked as P2/deferred in `TODO.md`. |
| **Microservices split** (separate API Service / Search Service / Engagement Service / Worker Pool deployables) | Not built. It's one Express monolith (`backend/src/app.js`) plus one BullMQ worker process (`backend/src/jobs/worker.js`) — see `docs/01-system-architecture.mermaid` for the real shape. |
| **A/B testing on sequence steps** | Not built. `SequenceStep` has no variant concept. |
| **Sign in with Microsoft** | Not built — dropped from the plan (2026-08-24); Google + email/password are the supported sign-in methods. |
| **Seat-count enforcement** | Plans are *priced* per seat but nothing limits how many seats a workspace fills — invites are capped (20 pending) yet accepted members aren't counted against a paid quantity. |
| **Domain-verified transactional email delivery** | `resendService.js` is real and configured with a live key on datapit.io, but sends still go from Resend's shared sandbox sender — real end users cannot yet receive a signup confirm link until a domain is verified in Resend. Open P0 item in `TODO.md`. |

## Interface stubs (real code path, simulated until configured)

Distinct from "not built" — these have a genuine integration behind a feature flag, and fall back to
a simulated/logged response when unconfigured, by design (so the whole app runs locally with zero
external accounts):

| Integration | Real when | Simulated when |
|---|---|---|
| Email verification (Hunter.io) | `EMAIL_VERIFIER_API_KEY` set | Unset — reveal proceeds `checked: false`, never hard-blocked except on an active negative confirmation. |
| Sequence send (SendGrid, `espService.js`) | `ESP_API_KEY` + `ESP_FROM_EMAIL` set | Unset — logs a fake `simulated-<uuid>` message id. |
| DataPit's own notification mail (Resend) | `RESEND_API_KEY` set | Unset — logs instead of sending; never throws either way. |
| Stripe checkout/subscriptions/webhooks | A secret key + webhook secret saved via `/control/settings` | Unconfigured — checkout returns a fake `billing.simulated.local` URL; webhook route 400s without a configured webhook secret. |
| Google Sign-In | `GOOGLE_CLIENT_ID` (backend) + `VITE_GOOGLE_CLIENT_ID` (frontend) set | Unset — `POST /auth/google` responds 503. |

Frontend test coverage is also thin on the oldest core screens (Login, Dashboard, People, Companies,
Sequences, marketing pages) — noted as a known gap in `TODO.md`, not claimed as covered here.
