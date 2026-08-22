# TODO — pending application-level work

Tracks gaps identified but not yet built. Update this file as items are
picked up or completed — don't let it drift from reality.

## P0 — blocks a real user/customer

- [ ] **Verify a sending domain in Resend.** Signup now requires clicking an
      emailed confirm link (see Done below), but sends still go from
      Resend's shared sandbox sender (`onboarding@resend.dev`), which only
      delivers to Resend's own test domains — confirmed `@resend.dev`
      delivers, `@example.com` and real customer domains are rejected. Until
      titans7.com (or similar) is verified in Resend and `RESEND_FROM_EMAIL`
      is pointed at it, **real users cannot receive their confirm link and
      cannot complete signup.**
- [ ] **Team/seat invites.** Plans are priced per seat and `Role`
      (OWNER/ADMIN/MEMBER) + `Membership` already exist in the schema, but
      there is no invite flow — every `/auth/register` call creates a brand
      new workspace. No way today for a paying customer to actually use more
      than 1 seat.
- [ ] **Password reset / forgot password.** No route, no token model, no UI.
      A locked-out user has zero self-service recovery path.
- [ ] **Sign in with Microsoft.** Needs an app registration (Client ID/
      Secret) in Microsoft Entra ID (Azure AD) from the user first.
- [ ] **GDPR opt-out has no UI.** `POST /api/v1/privacy/opt-out` is real and
      rate-limited, but the Privacy marketing page just says "contact us" —
      nothing calls the endpoint.

## P1 — real gaps, not urgent

- [ ] **No unread badge on the Tickets nav link** for a new admin reply —
      the email notification now exists (see Done below), but there's still
      no in-app indicator.
- [ ] **Marketing Contact form leads go nowhere** — logged only, not
      forwarded to sales/CRM.
- [ ] **No admin action audit log.** Suspend/unsuspend/plan-change/
      add-credits don't record which super admin performed them.
- [ ] **`docs/` is empty** despite README.md and ARCHITECTURE.md linking to
      files inside it (DATA-MODEL.md, API-SPEC.md, FEATURES.md, mermaid
      diagrams).
- [ ] **No rate limiting** on ticket creation/reply, sequence creation, list
      creation, or billing checkout/subscribe (auth-gated, so lower risk,
      but unprotected against a buggy retry loop or compromised account).

## P2 — known-deferred, not surprises

- [ ] CRM sync (Salesforce/HubSpot) — explicitly out of scope.
- [ ] Chrome extension — explicitly out of scope.
- [ ] No UI to create/manage additional super admins (CLI script only,
      `backend/src/utils/createSuperAdmin.js` — appears deliberate).
- [ ] Frontend test coverage is thin on the oldest core screens: Login,
      Dashboard, People, Companies, Sequences, marketing pages.
- [ ] **Code-split the marketing site from the authenticated app.** Adding
      framer-motion (for the marketing-page animations) pushed the single JS
      bundle to ~170KB gzipped, past Vite's 500KB (minified) chunk warning.
      Everyone pays that weight on first load, including users who only ever
      hit `/app`. Splitting the marketing routes (`pages/marketing/*`) from
      the authenticated app routes via `React.lazy`/dynamic `import()` in
      `App.jsx` would let each side load only what it needs. Not urgent today
      — worth doing before the bundle grows further.

## Done

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
      titans7.com, but sends still go from Resend's shared sandbox sender
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
      locally and on titans7.com.
- [x] **Polished the marketing site with Framer Motion.** Staggered entrance
      animations and scroll-triggered reveals on Home, Pricing, Product,
      Solutions, About, Contact, and the footer; a price crossfade on
      Pricing's billing-interval toggle. Shared primitives in
      `components/marketing/motion.jsx`, respects prefers-reduced-motion.
      (See the code-splitting item above — this is what pushed the bundle
      size warning.)
