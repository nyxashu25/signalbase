# Data Model

Source of truth: `backend/prisma/schema.prisma`. This document explains what's in there and why,
grouped by concern rather than declaration order. If this file and the schema ever disagree, the
schema wins — update this doc.

See `docs/02-er-diagram.mermaid` for the rendered relationships.

---

## 1. Tenancy: Org → Workspace → User

```
Org 1──* Workspace 1──* Membership *──1 User
```

| Model | Purpose |
|---|---|
| **Org** | The top-level tenant. Has a unique `slug`. Created automatically on signup — there's no "create an org" flow separate from registering. |
| **Workspace** | Where all tenant-scoped data (lists, credits, sequences, tickets...) actually lives. Carries `plan` (`FREE`/`BASIC`/`PROFESSIONAL`/`ORGANIZATION`), `seats` (paid seat count, default 1 — invites are blocked once members + pending invites reach it; set by the checkout quantity or an admin override; `monthlyCreditGrant` = per-plan credits × seats), and the Stripe linkage (`stripeCustomerId`, `stripeSubscriptionId`, `planActivatedAt`, `billingInterval`). |
| **User** | A login identity. Can belong to multiple workspaces across multiple orgs via `Membership`. Signup (`authService.register` / `loginWithGoogle`) creates one org+workspace+membership; accepting a `WorkspaceInvite` adds further memberships (and, for a new email, creates the User with no org/workspace of its own). The account menu's switcher re-scopes the session between seats (`POST /auth/switch-workspace`). |
| **WorkspaceInvite** | A pending seat invite (`email`, `role` ADMIN/MEMBER, `invitedById`, `expiresAt`, `acceptedAt`; `@@unique([workspaceId, email])`). The emailed link carries a purpose-scoped JWT holding this row's id — the row is the authority on revocation (deleted = dead link), expiry (7 days) and single-use (`acceptedAt`). Re-inviting upserts the row. |
| **Membership** | The join row between `User` and `Workspace`, carrying `role` (`OWNER`/`ADMIN`/`MEMBER`). One row per (user, workspace) pair — a role change updates it in place rather than creating a new row. |

Plan pricing and credit grants (`PLAN_MONTHLY_CREDITS`, `PLAN_PRICE_USD_CENTS`, `PLAN_HAS_SEQUENCES` in
`backend/src/config/planConfig.js`) are deliberately **not** in the schema — a pricing change is a
config edit, not a migration.

### `User` fields worth knowing

- **`passwordHash` is nullable.** A Google-only account never sets one; `authService.login`'s
  password check is null-safe (returns false rather than throwing). Such an account can set a first
  password in Settings → Security or via the forgot-password flow (both skip the "current password"
  proof — a live session or control of the inbox stands in for it).
- **`googleId`** is the Google "sub" claim, set either at signup (Google-only account) or
  retroactively the first time an existing password account signs in with Google using the same
  verified email.
- **`emailVerified`** starts `false` for password signups (flips true when the emailed confirm link
  is clicked — `POST /auth/verify-email`) and `true` for Google signups (Google already verified the
  email). Every account that existed before this field was added was grandfathered to `true`.
- **`suspendedAt`** is checked in `authService.login`/`refresh`, not per-request — this app issues
  short-lived stateless access tokens, so a suspension takes effect within one refresh cycle, not
  instantly on the next API call.
- **`marketingOptOut`** only gates the admin promotional broadcast, never transactional mail
  (verification, tickets, billing).
- **`tutorialCompletedAt`** is set once and never cleared, so the guided first-login tour shows
  exactly once per account, across devices — not a per-`localStorage` flag.

### `SuperAdmin` — a separate credential space

Not a `User` with an admin role. No membership, no workspace, no shared login route with the tenant
app. Signed with its own JWT secret (`ADMIN_JWT_SECRET`) and audience claim, so a tenant access token
can never be replayed against an admin-only route or vice versa (`middleware/adminAuth.js`,
`routes/admin.js`). The frontend surfaces this at `/control` (`AdminLogin.jsx` →
`RequireSuperAdmin.jsx`), which talks to the same backend under `/api/v1/admin/*`.

New super admins are created by a CLI script only (`backend/src/utils/createSuperAdmin.js`) — there
is deliberately no UI for it.

---

## 2. Data-import staging: `DatabaseImportBatch`

A super-admin-uploaded CSV in the "RPF" format (`backend/src/config/rpfFormat.js` defines the
required headers). Rows are parsed and inserted into `Company`/`Contact` immediately — via a BullMQ
`database-import` job, not inline in the request — so an admin can review the batch, but every row it
touched carries `importBatchId` and is **withheld from Elasticsearch** (not searchable) until the
batch is explicitly approved (`POST /admin/database-imports/:batchId/approve`). Approval clears
`importBatchId` on every affected row and enqueues them for indexing.

`errors` stores up to 100 per-row parse/validation failures (`{ row, message }`); `errorCount` is
the true total even when the stored array was capped.

---

## 3. The shared data graph: `Company` and `Contact`

Not tenant-scoped — every workspace searches the same underlying company/people database. What a
workspace has *saved* or *revealed* about that data is tracked separately (section 4).

| Model | Notable fields |
|---|---|
| **Company** | `domain` is `@unique` — the natural key used everywhere (e.g. `databaseImportService.upsertCompany` looks up by domain before inserting). `techStack` is a plain `String[]`; there is no separate technographics model or provider integration behind it — it's whatever string values a row happens to carry (seed data or CSV import). |
| **Contact** | `email`/`emailVerified` are populated once the pattern-finder/verifier has run (`emailFinderService.js`, `emailVerifierService.js`). **Every serializer must mask this field unless the requesting workspace has a matching `EmailReveal` row** — see `maskingService.attachRevealStatus`, which is the single choke point this is enforced through. `redactedAt` is set by a GDPR/CCPA erasure request (`privacyService.requestErasure`): once set, PII fields are wiped and the contact is permanently excluded from search/reveal, for every workspace, not just the one that requested it — the row itself survives (lists/reveals/sequence history hold foreign keys to it). |

---

## 4. Tenant-scoped state

Every model in this section carries a `workspaceId` and every query against them **must** filter by
the authenticated request's workspace (`req.auth.workspaceId` from `middleware/auth.js` — never a
client-supplied value). See the isolation tests in `lists.test.js` for the convention this is meant
to guard.

### Lists

`List` (name, `type`: `CONTACTS` | `COMPANIES`) has many `ListItem` rows. Exactly one of
`ListItem.contactId`/`companyId` is set, matching the parent list's type — enforced in
`listService.js`, not declaratively (Prisma has no XOR constraint). `@@unique([listId, contactId])`
and `@@unique([listId, companyId])` prevent adding the same record twice.

### Saved searches

`SavedSearch` (`type`: `PEOPLE` | `COMPANIES`, `name`, `filters Json`) is a workspace-shared
shortcut back to a People/Companies search — shared like lists, not a private bookmark. `filters` is
the frontend's filter state stored **verbatim** (`{ title, seniority: [...], emailStatus: [...],
sort, q … }`) and replayed client-side by `pages/People.jsx` / `pages/Companies.jsx`, which only
pick the keys they understand. The backend validates size (≤4KB) and shape but never interprets the
keys, so adding a filter to the search screens needs no migration here. Capped at 50 per type per
workspace (`savedSearchService.js`); deleting another workspace's row 404s rather than 403s.

### Getting-started checklist

`OnboardingTaskCompletion` (`workspaceId`, `key`, `completedAt`, `rewardCredits`, `rewardedAt`;
`@@unique([workspaceId, key])`) records that a checklist task — or, for `group:<key>` rows, a whole
group — is done. The checklist itself (keys, labels, CTAs, reward amounts) is code, in
`config/onboardingConfig.js`; this table only holds completion + payout state. Completion is
*detected* from the rows the task naturally produces (`EmailReveal`, `ListItem`, `SavedSearch`,
`Sequence`, `SequenceEnrollment`, `CompanyDetailView`, `User.emailVerified`/`tutorialCompletedAt`)
the next time the checklist is read, except `SEARCH_PEOPLE`, which has no row of its own and is
written by the people-search controller. `rewardedAt` is flipped with a guarded `updateMany … WHERE
rewardedAt IS NULL`, which is what makes a reward pay out exactly once under concurrent reads. Rows
are never deleted or un-completed.

### Credits & the append-only ledger

`CreditLedgerEntry` is **append-only** — the app never `UPDATE`s or `DELETE`s a row. A workspace's
balance is always:

```
workspace.monthlyCreditGrant + SUM(ledger.delta) − [credits currently reserved in Redis]
```

`reason` is one of `MONTHLY_GRANT`, `EMAIL_REVEAL`, `COMPANY_VIEW`, `CSV_EXPORT`,
`SEQUENCE_ENROLLMENT`, `TOPUP`, `ADJUSTMENT`, `ONBOARDING_REWARD` (getting-started checklist
payouts — kept separate from `ADJUSTMENT` so the ledger reads "Onboarding reward" and the total a
workspace has earned is one SUM). `amountCents` is only ever set on `TOPUP` rows (a real
Stripe purchase) — it's null even for `ADJUSTMENT` (an admin-granted credit isn't revenue). This is
the only place a dollar amount is recorded anywhere in the schema; everywhere else deals purely in
credit counts. See `docs/07-credits-state.mermaid` and `docs/03-data-enrichment-flow.mermaid` for the
reserve → commit/refund mechanics, which live mostly in Redis (`creditService.js`), not here.

`EmailReveal` and `CompanyDetailView` are both audit-trail-plus-reveal-state rows: once any member of
a workspace reveals a contact's email (or pays to view a company profile), the whole workspace can
see it for free from then on. The `@@unique([workspaceId, contactId])` / `@@unique([workspaceId,
companyId])` constraints are what make that workspace-wide-and-one-time, not per-user or per-visit —
and they're also what a concurrent duplicate request collides against (handled as a `P2002` race in
`revealService.js`/`searchService.getCompanyDetail`, refunding instead of double-charging).

### Sequences (engagement)

```
Sequence 1──* SequenceStep
Sequence 1──* SequenceEnrollment 1──* SequenceStepEvent
```

A `Sequence` is a template (`status`: `DRAFT`/`ACTIVE`/`PAUSED`/`ARCHIVED`) made of ordered
`SequenceStep` rows (`@@unique([sequenceId, order])`), each either `WAIT` (`waitDays`) or `EMAIL`
(`subject`/`body`). A `SequenceEnrollment` is one contact's progress through it —
`currentStepIndex` plus `nextStepDueAt`, the field the cadence engine's whole due-query filters on
(`WHERE status = 'ACTIVE' AND "nextStepDueAt" <= now()`, indexed). `workspaceId` is denormalized onto
the enrollment from its parent sequence so isolation queries never need a join — the same
defense-in-depth pattern as `List`/`CreditLedgerEntry`. `@@unique([sequenceId, contactId])` caps a
contact to one active-or-not enrollment per sequence at a time.

`SequenceStepEvent` records `SENT`/`OPENED`/`CLICKED`/`BOUNCED`/`REPLIED`/`UNSUBSCRIBED` per step.
`providerEventId` is unique so an at-least-once webhook redelivery from the ESP can't double-count an
event (`webhookService.processEvent` catches the resulting `P2002` and treats it as "already
processed").

`SuppressionEntry` is **workspace-scoped, not global** — a recipient unsubscribes from *this
workspace's* sends, matching how CAN-SPAM/GDPR compliance is actually tracked (per-sender). Checked
at send time in the step processor (`sequenceService.processOne`), not at enrollment time.

### Support: `Ticket` / `TicketMessage`

A `Ticket` (`type`: `SUPPORT`|`SALES`) is one thread; its opening message and every reply from either
side are `TicketMessage` rows in creation order — there is no separate "body" field on `Ticket`
itself, so the UI renders the thread uniformly instead of special-casing the first message.
`authorType` (`USER`|`ADMIN`) pairs with exactly one of `authorUserId`/`authorAdminId` (same XOR
convention as `ListItem`, enforced in `ticketService.js`).

`status` (`UNANSWERED`/`ANSWERED`/`CLOSED`): `UNANSWERED` means waiting on the admin (just created,
or the user replied most recently); `ANSWERED` means the admin has replied and it's the user's turn;
"active" tickets shown to a user are `UNANSWERED` + `ANSWERED`. Predefined subjects and the reply
length limit live in `backend/src/config/ticketConfig.js`, not the schema — same pattern as plan/
credit config elsewhere.

---

## 5. Global, not workspace-scoped

- **`DataSubjectOptOut`** — a real person's right over the shared data graph itself, orthogonal to
  which tenant looked them up. `email` is the key; `isOptedOut()` is checked before a new
  pattern-guessed reveal is persisted (`revealService.js`).
- **`PaymentGatewaySettings`** — platform-wide Stripe config set by a super admin
  (`/control/settings`, `paymentSettingsService.js`). Single row, `id` fixed to the literal
  `'stripe'` in application code rather than a schema default, so every read/write path is an
  explicit, greppable literal. `keySecretEncrypted`/`webhookSecretEncrypted` are AES-256-GCM
  ciphertext (`backend/src/utils/crypto.js`), never plaintext — this is *not* an env var, unlike
  every other third-party credential in this app (see `backend/.env.example`).
- **`AdminAuditLog`** — the compliance trail for support-desk overrides: who (`superAdminId`, a real
  FK to `SuperAdmin`) did what (`action`) to whom (`targetUserId`), when, with action-specific
  `metadata` (e.g. `{from, to}` for a plan change, `{amount}` for a credit grant). `targetUserId` is
  deliberately a plain field, not a relation — same "soft reference" pattern as
  `CreditLedgerEntry.contactId` below — so the log entry survives even if the target `User` row is
  later gone; `adminService.listAuditLog` looks it up manually rather than via `include`. Written by
  `adminService.recordAuditLog`, called from `suspendUser`/`unsuspendUser`/`updateUserPlan`/
  `addCredits`. Read via `GET /admin/audit-log`, surfaced at `/control/audit-log`.

---

## 6. Enums reference

| Enum | Values |
|---|---|
| `Plan` | `FREE`, `BASIC`, `PROFESSIONAL`, `ORGANIZATION` |
| `BillingInterval` | `MONTH`, `QUARTER`, `YEAR` |
| `Role` | `OWNER`, `ADMIN`, `MEMBER` |
| `ImportBatchStatus` | `PROCESSING`, `PENDING_APPROVAL`, `APPROVED`, `FAILED` |
| `ListType` | `CONTACTS`, `COMPANIES` |
| `CreditReason` | `MONTHLY_GRANT`, `EMAIL_REVEAL`, `COMPANY_VIEW`, `CSV_EXPORT`, `SEQUENCE_ENROLLMENT`, `TOPUP`, `ADJUSTMENT`, `ONBOARDING_REWARD` |
| `SequenceStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED` |
| `StepType` | `EMAIL`, `WAIT` |
| `EnrollmentStatus` | `ACTIVE`, `PAUSED`, `COMPLETED`, `UNENROLLED` |
| `StepEventType` | `SENT`, `OPENED`, `CLICKED`, `BOUNCED`, `REPLIED`, `UNSUBSCRIBED` |
| `SuppressionReason` | `UNSUBSCRIBED`, `BOUNCED`, `MANUAL` |
| `TicketType` | `SUPPORT`, `SALES` |
| `TicketStatus` | `UNANSWERED`, `ANSWERED`, `CLOSED` |
| `TicketAuthorType` | `USER`, `ADMIN` |
| `AdminAuditAction` | `SUSPEND_USER`, `UNSUSPEND_USER`, `UPDATE_PLAN`, `ADD_CREDITS`, `SAVE_STRIPE_SETTINGS`, `APPROVE_IMPORT`, `SEND_PROMOTION` |
| `SavedSearchType` | `PEOPLE`, `COMPANIES` |

---

## 7. What's *not* in this schema

No `Technographics`, `IntentSignal`, `FundingEvent`, or CRM-sync model exists. `ARCHITECTURE.md`'s
"Technographics" and "Intent / Buying Signals" pillars describe a product direction, not a built
data model — `Company.techStack` is the only trace of the former (a plain string array, not a
scraped/scored dataset), and there is no intent-scoring, job-change-alert, or funding-event table at
all. See `docs/FEATURES.md` for the full built-vs-not-built breakdown.
