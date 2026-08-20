# TODO — pending application-level work

Tracks gaps identified but not yet built. Update this file as items are
picked up or completed — don't let it drift from reality.

## P0 — blocks a real user/customer

- [ ] **Team/seat invites.** Plans are priced per seat and `Role`
      (OWNER/ADMIN/MEMBER) + `Membership` already exist in the schema, but
      there is no invite flow — every `/auth/register` call creates a brand
      new workspace. No way today for a paying customer to actually use more
      than 1 seat.
- [ ] **Password reset / forgot password.** No route, no token model, no UI.
      A locked-out user has zero self-service recovery path.
- [ ] **Sign in with Google.** Needs an OAuth 2.0 client (Client ID/Secret)
      from Google Cloud Console — the user needs to create that and hand us
      the credentials before this can be wired up (authorized redirect URI
      will be `https://titans7.com/api/v1/auth/oauth/google/callback` or
      similar).
- [ ] **Sign in with Microsoft.** Same shape — needs an app registration
      (Client ID/Secret) in Microsoft Entra ID (Azure AD) from the user
      first.
- [ ] **GDPR opt-out has no UI.** `POST /api/v1/privacy/opt-out` is real and
      rate-limited, but the Privacy marketing page just says "contact us" —
      nothing calls the endpoint.

## P1 — real gaps, not urgent

- [ ] **Ticket replies don't notify the user.** Admin gets a browser
      notification when a ticket is raised; the user gets nothing when the
      admin replies (no email, no unread badge on the Tickets nav link).
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

## Done

- [x] Fixed "Start free" CTAs across the marketing site — they were landing
      on the Sign In form instead of the Create Workspace form. Now link to
      `/login?mode=register`, which `Login.jsx` reads to open directly in
      register mode.
