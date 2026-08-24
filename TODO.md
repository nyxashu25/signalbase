# TODO — pending application-level work

Tracks gaps identified but not yet built. Update this file as items are
picked up or completed — don't let it drift from reality.

## P0 — blocks a real user/customer

- (No open P0s. Email delivery went live 2026-08-24 — datapit.io verified
  in Resend, sends from `no-reply@datapit.io` — so signup, invites, and
  password resets all reach real inboxes now. Invites, password reset and
  the GDPR opt-out UI shipped the same day; Microsoft sign-in was dropped.)

### Waiting on the user (not code)

- Add **https://datapit.io** (and https://www.datapit.io) to the Google OAuth
  client's authorized JavaScript origins in the Google Cloud console — the
  client ID is configured, but Google sign-in only works from an allow-listed
  origin, and the site now lives on datapit.io, not titans7.com.

## In-app UX overhaul — complete (see `docs/UX-ROADMAP.md`)

Benchmarked against Apollo.io's authenticated app. **All five phases are
shipped and live** (shell + primitives, search screens, getting-started
hub, designed empty states / detail pages / sequence analytics, settings
area), and the two sections that were waiting on P0s are now complete too:
*Users & teams* invites seats and *Security* pairs with the forgot-password
flow. Nothing further is planned under the roadmap; new UX work gets its
own item here.

## P1 — real gaps, not urgent

- [ ] **Backfill phone numbers on already-imported production contacts.**
      Until 2026-08-22 the RPF importer discarded `TelephoneNo` /
      `Alternative No.`, so every contact imported before then has
      `phone = null` even if the CSV had one. New imports are fine. Fix is
      operational: re-upload the original RPF CSV(s) through Extend Database
      (companies/contacts are matched by domain/name and upserted) or run a
      one-off backfill script against the CSV — no code change needed, but
      nothing has been re-imported yet.

## P2 — known-deferred, not surprises

- [ ] CRM sync (Salesforce/HubSpot) — explicitly out of scope.
- [ ] No UI to create/manage additional super admins (CLI script only,
      `backend/src/utils/createSuperAdmin.js` — appears deliberate).
- [ ] Chrome Web Store submission for the extension (built 2026-08-24, see
      Done below) — needs a $5 developer account + review; distributed as
      load-unpacked until then.

## Done

- [x] **Chrome extension — LinkedIn lookup, reveal & sourcing pipeline
      (2026-08-24; plan in `docs/EXTENSION-PLAN.md`).** `extension/` is a
      plain MV3 extension (load-unpacked, no build step): on any
      `linkedin.com/in/…` profile it calls `POST /extension/observe` and a
      shadow-DOM card shows one of three outcomes — **found** (masked
      contact; *Reveal email & phone · 4 credits*, `EXTENSION_REVEAL`
      ledger reason, free when the workspace already revealed it),
      **not found** (queued as a `MissingPerson` → admin **"Pending
      peoples"** page with report-count dedup, page-text expander, copy-as-
      RPF-row, Mark added/Dismiss, and auto-ADDED when an import lands the
      slug), or **found + title changed** (queued as a `LostChild` → admin
      **"Childs found"** page; Apply updates the shared contact + reindexes,
      audited). Auth is per-user API keys (`dpk_…`, argon2-hashed, shown
      once, revocable, max 10) minted in the new Settings → **API &
      Extension** page — this also seeds the "API access" the Professional
      plan advertises. `Contact.linkedinSlug` (normalized, indexed,
      backfilled 120/121) is the matching identity. Admin nav shows live
      PENDING badges. Backend 328 tests, frontend 162, prod-e2e now 45
      checks (extension leg added). LinkedIn-ToS risk accepted per plan.

- [x] **Ops hardening (2026-08-24).** Nightly `pg_dump` backups (03:17 UTC,
      14-day retention, sanity-checked, `.env` included for the encryption
      key) via `deploy/backup.sh` + systemd timer, with a documented,
      test-restored recovery procedure; a 5-minute health watchdog
      (`deploy/healthwatch.sh`) checking readiness, api/worker processes,
      disk and backup freshness, emailing alerts through Resend
      (edge-triggered + hourly reminders + recovery notice); Prometheus
      installed and scraping `/metrics` every 15s (30d retention, UI on
      localhost:9090 via SSH tunnel); Redis switched to AOF persistence.
      Offsite backup shipping (S3/B2) deliberately left as a user decision —
      needs credentials.

- [x] **Frontend coverage for the oldest screens (2026-08-24).** 16 new
      tests, suite now 155: Login (password sign-in lands in /app,
      invalid-credentials error, forgot-password link only in sign-in
      mode), People (reveal patches the row in place with email + tel: phone
      + verified badge; job-title contains-filter commits on Enter and
      chips), a new Companies suite (rows with detail link/industry/employee
      bucket/website+LinkedIn links, headcount facet re-query + chip,
      bulk-select without a reveal action, sort), and a marketing suite
      (Home "Start free" → register mode; Pricing shows all four tiers and
      recomputes quarterly/annual prices with the same math the backend
      charges; Contact form posts the lead and confirms; Privacy §7 opt-out
      form posts + confirms and explains the 429; Terms/About render).

- [x] **Email delivery is live (2026-08-24).** datapit.io verified in
      Resend (user action); `RESEND_FROM_EMAIL=no-reply@datapit.io` on the
      server and locally; real delivery confirmed (messageId
      `6bfb5015-ae86-…` to a Gmail inbox). Signup confirm links, invites,
      password resets, ticket/billing mail and broadcasts now reach real
      addresses. Settings' "copy invite link" stays as a convenience.
- [x] **Seat-count enforcement (2026-08-24, decision: block over the paid
      count).** New `Workspace.seats` (default 1 — the Free plan's single
      seat); bought as the Stripe checkout quantity (Billing gained a Seats
      field; Organization min 3) with the monthly credit grant scaling per
      seat; super admins can override seats (audited fromSeats→toSeats).
      Invites are blocked once members + pending invites reach the count
      (pending invites reserve a seat; re-inviting doesn't double-count) and
      the seat is re-checked at accept. Users & teams shows "x of N seats
      filled", disables inviting when full and points at Billing; Free
      workspaces get an upgrade prompt instead. Backend 278 tests, frontend
      139.

- [x] **Full regression pass (2026-08-24).** Backend 272/272 (run twice:
      shared env, then isolated env), frontend 138/138 + lint + build; a
      browser sweep of all 18 authenticated routes and the 7 admin routes
      with zero page errors; and a new self-cleaning production E2E
      (`backend/scripts/prod-e2e.mjs`, see RUNBOOK) that exercised the real
      datapit.io API end to end — signup→verify→login, search+masking,
      reveal (email+phone, 2 credits), lists, saved searches, onboarding
      rewards, plan gating, tickets, invite→accept→members, forgot→reset
      (single-use both ways), privacy opt-out — 33/33 checks, all probe
      data deleted afterward.
- [x] **Backend test suite isolated from local dev state.** `.env.test` now
      points Redis at logical DB 1 and prefixes ES indices with `test-`
      (new `ES_INDEX_PREFIX` env, default empty, `config/esIndices.js`), so
      `npm test` can no longer wipe dev credit balances, sessions, or the
      search index. Proven with a sentinel key + index counts surviving a
      full suite run.
- [x] **Seed refreshes on re-run.** `seed.js` upserts now update the
      seed-owned fields (titles, phones, tech stacks, …) on existing rows —
      everything except `email`/`emailVerified`, which the billed reveal
      flow owns.

- [x] **P0 trio shipped (2026-08-24): seat invites, password reset, GDPR
      opt-out UI.**
      **Invites** — `WorkspaceInvite` model (unique per workspace+email,
      7-day expiry, single-use, revocable); ADMIN+ manage them in Settings →
      Users & teams (role picker, pending list with copyable `inviteUrl` —
      the workaround while Resend is sandboxed — and revoke); public accept
      page creates the account (new email, pre-verified, no new workspace)
      or adds a membership (existing account); the account menu grew a
      workspace switcher (`GET /auth/workspaces`, `POST
      /auth/switch-workspace`); inviter gets an acceptance email.
      **Password reset** — "Forgot password?" on Login → enumeration-safe
      `POST /auth/forgot-password` → emailed 1h single-use link (token
      carries a fingerprint of the current hash, so it dies on any password
      change) → `/reset-password` page; also serves Google-only accounts as
      first-password setup, and verifies the email as a side effect.
      **GDPR opt-out** — the Privacy page's new §7 "Remove my data" form
      wires the existing `POST /privacy/opt-out` (429-aware, permanent-
      action copy). Backend 272 tests, frontend 138.
- [x] **Dropped: Sign in with Microsoft** (2026-08-24, user decision) —
      Google + email/password are the supported sign-in methods.

- [x] **Moved production from titans7.com to datapit.io (2026-08-23).** App
      dir is `/var/www/datapit.io/app`; nginx site
      `/etc/nginx/sites-available/datapit.io` (upstream `datapit_io`, Let's
      Encrypt cert for datapit.io + www via certbot --nginx, HTTP→HTTPS,
      immutable caching on `/assets/`, `no-cache` on index.html); pm2 apps
      are now `datapit-api` / `datapit-worker` (saved); backend
      `CORS_ORIGIN=https://datapit.io` (also the base for every emailed
      link). `titans7.com` / `www.titans7.com` 301 to `https://datapit.io`
      on both 80 and 443 (its old cert stays in place for the https hop).
      Auto-renewal confirmed 2026-08-24: `certbot renew --cert-name
      datapit.io --dry-run` succeeds and `certbot.timer` is active.
      Nothing in the app bundle referenced the domain, so no code change —
      docs/runbook/diagrams updated.

- [x] **Phone numbers on reveal.** `Contact.phone` (seeded, and now mapped
      from the RPF `TelephoneNo`/`Alternative No.` columns on import — it was
      being dropped) shows in a Phone column next to Email on People,
      Companies→profile and list detail; masked (`+1 415 *** **32`) until the
      same 2-credit reveal unlocks both, then a `tel:` link with copy. CSV
      exports carry it too. Fixed on the way: `GET /lists/:id` returned list
      contacts' emails in the clear — it now runs the same masking gate as
      search.
- [x] **App content is full-width** (dropped the 1440px cap) so wide screens
      use the space.
- [x] **UX roadmap Phases 4 + 5.** One illustration per object type on every
      empty state; Sequences *All / Analytics* tabs with a workspace KPI grid
      + per-sequence table; ListDetail is the search table (reveal, phone,
      remove); Tickets tabs carry live counts; Billing shows renewal /
      commitment date. `/app/settings` with Profile, Workspace (rename,
      ADMIN+), Users & teams (seat list; invites disabled until the P0),
      Security (change or first-set password, Google link status),
      Notifications (marketing opt-out toggle), Integrations (honest empty
      state). `/app/profile` redirects into it.
- [x] **P1: admin audit log now also records** Stripe-settings saves (field
      names only), import approvals and promotional broadcasts.
- [x] **P1: admin panel nudges on customer replies.** The ticket poller keys
      on `updatedAt`, so a reply to an answered thread fires a "Customer
      replied" browser notification and a red flag in the tickets list; tab
      pills show live counts.

- [x] **UX roadmap Phase 3 — Home as a getting-started hub.** A 10-task,
      3-group checklist detected from real data (`onboardingService.js`,
      `OnboardingTaskCompletion`), paying +5/task and +10/group up to 75
      credits as `ONBOARDING_REWARD` ledger rows exactly once, with success
      toasts and a sidebar progress card; Overview tab with Reveals /
      Credits-used this month tiles (`GET /dashboard/stats`); Tools tab for
      the email verifier; Resources strip → a new in-app Help guide
      (`/app/help`, also in the sidebar + ⌘K); the tour is replayable via
      `?tour=1`. "Invite a teammate" is shown greyed as coming soon (P0
      above). Details and deviations in `docs/UX-ROADMAP.md`.
- [x] **Code-split the marketing site / app / admin panel.** `App.jsx` now
      `React.lazy`-loads every page; the first-load bundle dropped from
      ~280KB gzip (900KB minified) to ~108KB gzip (331KB), with the
      framer-motion/GSAP/Lenis marketing chunk (~51KB gzip) and the app
      shell (~21KB gzip) only fetched on their own routes.

- [x] **Closed out the five P1 gaps in one pass:**
      **Unread ticket badge** — `AppLayout`'s Tickets nav link shows a count
      of this workspace's `ANSWERED` tickets (support replied, your turn),
      polled every 30s (`useAnsweredTicketsBadge.js`).
      **Contact-form lead forwarding** — `POST /contact` now emails every
      super admin via `notificationService.sendContactFormLead` instead of
      only logging (no CRM to push to — still deferred, see P2).
      **Admin action audit log** — new `AdminAuditLog` model records every
      suspend/unsuspend/plan-change/add-credits with the acting super admin,
      the target user, and before/after metadata; surfaced at
      `/control/audit-log` (`adminService.recordAuditLog`/`listAuditLog`).
      **`docs/` populated** — `DATA-MODEL.md`, `API-SPEC.md`, `FEATURES.md`,
      and 8 `.mermaid` diagrams, all reflecting the real system (not the
      aspirational one `ARCHITECTURE.md` sketches — `FEATURES.md` explicitly
      separates built vs. not-built vs. interface-stub). README.md/
      ARCHITECTURE.md got a short pointer to `docs/FEATURES.md` since both
      overstate what's built (technographics, intent scoring, CRM sync,
      Chrome extension, a microservices split — none of which exist).
      **Rate limiting** — per-workspace limiters on ticket create (10/hr) and
      reply (30/hr), sequence create (20/hr), list create (30/hr), and
      billing checkout-session/subscribe (10/hr, shared bucket).
- [x] **Email notifications (Resend) + mandatory email verification.**
      Password signup now creates an unverified account, emails a confirm
      link, and only logs the user in once they click it (`GET
      /auth/verify-email`); login rejects an unverified account with a
      resend-verification option. Google sign-up skips this — Google already
      verified the email. On verification: welcome email to the user, alert
      email to every super admin. Ticket create/admin-reply/close all email
      the ticket's creator. Billing: Stripe credit top-up, Stripe plan
      activation, monthly credit renewal, and admin-granted
      credits/plan-override all send a confirmation email. New admin Control
      Panel card (`Settings`) sends a one-off promotional broadcast to every
      non-suspended, non-opted-out user, with a per-user unsubscribe link.
      `resendService.js`/`notificationService.js` are new; gated behind
      `RESEND_API_KEY` (unset = simulated/logged send, same posture as the
      existing `ESP_API_KEY`). Configured with a real key locally and on
      datapit.io, but sends still go from Resend's shared sandbox sender
      (`onboarding@resend.dev`) — real end-user delivery needs a verified
      domain in Resend, tracked as a P0 item above.
- [x] Fixed "Start free" CTAs across the marketing site — they were landing
      on the Sign In form instead of the Create Workspace form. Now link to
      `/login?mode=register`, which `Login.jsx` reads to open directly in
      register mode.
- [x] **Sign in with Google.** Google Identity Services button on the Login
      page (`GoogleSignInButton.jsx`); backend verifies the ID token
      (`authService.loginWithGoogle`) and links-or-creates an account by
      verified email. `User.passwordHash` is now optional and
      `User.googleId` was added. Configured via `GOOGLE_CLIENT_ID`
      (backend/.env) and `VITE_GOOGLE_CLIENT_ID` (frontend/.env) — both set
      locally and on datapit.io.
- [x] **Polished the marketing site with Framer Motion.** Staggered entrance
      animations and scroll-triggered reveals on Home, Pricing, Product,
      Solutions, About, Contact, and the footer; a price crossfade on
      Pricing's billing-interval toggle. Shared primitives in
      `components/marketing/motion.jsx`, respects prefers-reduced-motion.
      (See the code-splitting item above — this is what pushed the bundle
      size warning.)
