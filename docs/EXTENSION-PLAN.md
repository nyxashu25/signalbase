# Chrome Extension — LinkedIn lookup, reveal, and data-sourcing pipeline

Step-by-step build plan, written 2026-08-25 before any code. The extension
turns every LinkedIn profile visit into one of three outcomes:

| The profile is… | Extension shows | Backend records |
|---|---|---|
| **In our database** | "Found in DataPit" + *Reveal email & phone · 4 credits* | an `EmailReveal` on reveal (workspace-wide, same as in-app) |
| **Not in our database** | "Not in DataPit yet — queued for sourcing" | a **`MissingPerson`** row → super admin sees it under **Pending peoples** |
| **In our database, but the job title on LinkedIn differs** | "Found (title change reported)" — reveal still works normally | a **`LostChild`** row → super admin sees it under **Childs found** |

Terminology is deliberate and used verbatim in the UI: *missing peoples* /
*Pending peoples* for unsourced profiles, *lost-child* / *Childs found* for
stale records.

---

## Phase 0 — decisions to lock before building

1. **Extension auth = per-user API keys** (recommended). A new `ApiKey`
   model + a Settings → *API & Extension* page where a user generates a
   revocable key (`dpk_…`, shown once) and pastes it into the extension.
   Why not reuse the web session: the httpOnly refresh cookie is scoped to
   datapit.io and doesn't travel cleanly from a `chrome-extension://`
   origin; keys sidestep all cookie/CORS fragility, are revocable per
   device, *and* finally deliver the "API access" the Professional plan
   already advertises (keys double as the public-API credential later).
2. **Pricing**: extension reveal = **4 credits** (`EXTENSION_REVEAL` in
   `creditPricing.js`); in-app reveal stays 2. A contact the workspace
   already revealed shows email+phone in the extension **free** (reveals
   are workspace-wide — same rule as in-app).
3. **Plan gating**: extension available on **all plans** (it spends
   credits, and Free's 100 credits self-limit it). Flag if you want it
   paid-only.
4. **Distribution**: start with "load unpacked" / a zipped build for your
   own machines. Chrome Web Store submission is a separate later step
   (needs a $5 developer account + review, and a public privacy policy —
   we have one).
5. **Eyes-open note**: auto-collecting profile data is against LinkedIn's
   ToS even when user-initiated; the account browsing does the visiting,
   the extension only reads the page the user already sees and sends it to
   *our* backend. Volume is human-speed. Accepting that risk is a business
   call — the plan assumes yes.

---

## Phase 1 — backend foundation (models, auth, matching)

1. **Schema** (one migration):
   - `ApiKey { id, userId, name, prefix, keyHash, lastUsedAt, createdAt, revokedAt }`
     — key shown once, stored hashed (same argon2 utils as passwords);
     lookup by `prefix` then verify hash. Auth middleware `requireApiKey`
     resolves to the same `req.auth = { userId, workspaceId, orgId, role }`
     shape (primary workspace), so every existing service works unchanged.
   - `Contact.linkedinSlug String?` + index — normalized identity for
     matching (`/in/<slug>` lowercased, query/trailing-slash stripped).
     Backfill migration computes it from existing `linkedinUrl`s; the
     importer and seed populate it on write.
   - `MissingPerson { id, linkedinSlug @unique, linkedinUrl, name, jobTitle,
     location, companyName, domText, status PENDING|ADDED|DISMISSED,
     reportCount, firstReportedById, lastReportedAt, createdAt }` —
     re-reports bump `reportCount`/`lastReportedAt` instead of duplicating,
     so the admin sees demand per profile.
   - `LostChild { id, contactId, linkedinSlug, oldTitle, newTitle,
     observedCompanyName, domText, status PENDING|APPLIED|DISMISSED,
     reportCount, lastReportedAt, createdAt }` — one PENDING row per
     contact; re-observations update it.
   - `domText` capped (~200 KB, text-only — no HTML) and stripped of
     scripts; it exists so an admin can hand-extract details the parser
     missed.
2. **CORS**: allow `chrome-extension://<id>` origins via a new
   `EXTENSION_ORIGINS` env (comma-separated), alongside `CORS_ORIGIN`.
3. **Settings → API & Extension page**: generate / name / revoke keys,
   copy-once display, `lastUsedAt` shown. (This is also the seed of the
   public API story.)
4. Tests: key auth (valid/revoked/garbage), slug normalization table-test,
   backfill correctness.

## Phase 2 — the three-way observe endpoint + extension reveal

1. `POST /api/v1/extension/observe` (API-key auth, ~60/hour/workspace,
   body ≤ 256 KB): `{ linkedinUrl, name?, jobTitle?, location?,
   companyName?, domText? }` → normalizes the slug, then:
   - **found** (slug matches a Contact): return the contact *through the
     same masking gate as search* (`attachRevealStatus` — masked email/
     phone unless already revealed) + `cost: 4`.
   - **found + title differs** (case-insensitively, non-empty): everything
     above, **plus** upsert the `LostChild` row; response flags
     `titleChangeReported: true`.
   - **not found**: upsert `MissingPerson` (bump reportCount on repeats);
     response `{ status: 'not_found', queued: true }`.
2. `POST /api/v1/extension/contacts/:id/reveal` — same reserve → commit →
   `EmailReveal` pipeline as the in-app reveal but reserving
   `EXTENSION_REVEAL` (4); idempotency-key required; already-revealed
   short-circuits free. Writes the same ledger reason `EMAIL_REVEAL`
   (amount tells the story) — or a distinct `EXTENSION_REVEAL` reason if
   you want it separable in the ledger UI (my vote: distinct reason,
   clearer ledger).
3. The extension reveal also counts toward the onboarding `REVEAL_EMAIL`
   task, dashboards, and reconciliation with zero extra work (shared
   pipeline).
4. Tests: all three classifications, masking on found, dedup/reportCount,
   title-change upsert (and no LostChild when titles match), 4-credit
   charge + free repeat, rate limit, payload cap, isolation.

## Phase 3 — super admin panels

1. **Pending peoples** (`/control/pending-peoples`): table of PENDING
   `MissingPerson` rows — name, title, company, location, report count,
   last seen, link to the LinkedIn profile, expandable captured text.
   Actions: **Dismiss**, **Mark added**; plus a one-click **"copy as RPF
   row"** helper so sourcing feeds straight into Extend Database.
   Auto-resolution: when a CSV import (or any contact create) lands a
   contact whose `linkedinSlug` matches a PENDING row, mark it `ADDED`
   automatically.
2. **Childs found** (`/control/childs-found`): old title vs observed title
   side-by-side. Actions: **Apply** (updates `Contact.title`, reindexes,
   marks APPLIED) and **Dismiss**.
3. Nav badges with PENDING counts for both pages (same live-poll pattern
   as admin tickets).
4. Both Apply/Dismiss/Mark-added actions land in the **admin audit log**
   (new `AdminAuditAction` values) — Apply mutates shared data, so it must
   be traceable.
5. Tests: list/action routes, auto-resolution on import, audit rows,
   frontend page tests.

## Phase 4 — the extension itself (Manifest V3, in `extension/`)

1. **Structure**: `manifest.json` (MV3; `host_permissions`:
   `https://www.linkedin.com/*`, `https://datapit.io/*`; storage
   permission), background service worker (API client + key storage in
   `chrome.storage.local`), content script on `linkedin.com/in/*`, popup
   (key entry, connection status, credit balance), options page (API base
   URL override for local dev). Plain ES modules + a tiny esbuild/Vite
   build — no framework, the UI is small.
2. **Profile detection**: LinkedIn is a SPA — watch `history` pushState +
   a MutationObserver; trigger only on `/in/<slug>` pages, once per slug
   per tab, after the header card renders.
3. **Parser**: extract name / headline (job title) / location / current
   company from the profile header with layered selectors and text
   heuristics; always ship the visible text (`document.body.innerText`,
   capped) as `domText` so a LinkedIn markup change degrades to
   "admin reads the text" instead of silent garbage.
4. **Panel UI** (shadow-DOM floating card, DataPit-branded, dismissible):
   - signed-out → "Connect DataPit" → opens popup;
   - found → name + company match, *Reveal email & phone · 4 cr* button →
     revealed values with copy buttons (and "already revealed — free" when
     applicable);
   - not found → "Not in DataPit yet — queued for our data team";
   - title change → found-state plus a subtle "title change reported" note.
   Errors (out of credits → link to Billing; rate-limit; key revoked) get
   human messages.
5. **Privacy posture in the extension**: it only ever runs on
   `linkedin.com/in/*`, only talks to `datapit.io`, and sends nothing until
   a key is configured.

## Phase 5 — verification, docs, ship

1. Backend suites green + new tests; `prod-e2e.mjs` grows an extension leg
   (observe found/not-found/title-change + 4-credit reveal via a seeded
   probe contact, self-cleaning).
2. Manual E2E: load unpacked against local dev, walk a real LinkedIn
   profile through all three outcomes; then re-point at production and
   repeat once.
3. Docs: FEATURES/API-SPEC/DATA-MODEL updates; `extension/README.md`
   (install-unpacked steps for your team); TODO updated (this also retires
   the "Chrome extension — out of scope" P2 line).
4. Ship backend + admin first (they're inert without the extension), then
   hand you the zipped extension build. Store submission whenever you say.

---

## Sequencing & effort

Phases 1–3 are one backend/admin arc (models → endpoints → panels) and can
ship independently; Phase 4 is the extension consuming them. Biggest
uncertainty is Phase 4's LinkedIn DOM parsing — mitigated by always
shipping `domText` so the pipeline still works when selectors rot.
