# UX Roadmap — bringing the in-app experience to Apollo's level

Benchmark source: 12 screenshots of Apollo.io's authenticated app (Home /
Getting started, Find people, Find companies, Lists, Data enrichment,
Sequences, Emails, Calls analytics, Tasks, Saved people, Admin settings
flyout), studied against DataPit's current `/app` screens
(`AppLayout`, `Dashboard`, `People`, `Companies`, `Lists`, `Sequences`,
`FacetPanel`, `ContactRow`, `Pagination`).

This is about the **authenticated product**, not the marketing site — the
marketing site already had its editorial redesign.

---

## 1. What makes Apollo read as "professional" — the key pointers

### 1.1 App shell

| Apollo | DataPit today | Gap |
|---|---|---|
| Sidebar grouped by job-to-be-done (**Prospect and enrich** › People, Companies, Lists, Data enrichment · **Engage** › Sequences, Emails, Calls, Tasks · **Win deals** · **Tools and automation** · **Inbound** · **Saved records**), each group collapsible with a chevron, every item has a 16px line icon | Flat list of 6 text-only links + Tickets pinned at the bottom | No grouping, no icons (except Tickets), no collapse |
| Sidebar collapse-to-rail button (`«`) top-right of the sidebar | None | — |
| Bottom of sidebar: always-visible **Upgrade** CTA (the one brightly-colored element on screen), an **Onboarding hub** progress card ("0% Completed" → "2%" → "11%"), **Email setup and health**, **Admin Settings** with a flyout submenu (Users and teams, System activity, Security, Plan overview, Integrations, All settings) | Nothing below the nav | No persistent upsell, no onboarding progress, no settings area |
| Top bar: centered global **command palette** "Search or ask a question ⌘K"; right: **credits pill** (`75 credits`), AI Assistant, **notification bell**, avatar | Workspace name left; CreditBadge + theme toggle + profile right | No global search, no bell; credits exists but is a text badge |
| Dismissible **announcement banner** across the very top with its own CTA | None | — |

### 1.2 Home = a getting-started hub, not a stats page

- Gamified **onboarding checklist**: "Complete these tasks in your first 14 days to earn up to 75 credits", a progress bar, task *groups* ("Start reaching the right prospects — Earn 30 credits — 0 of 6 completed"), each row = checkbox · **bold action** + muted explanation · right-aligned CTA (the *next* task's CTA is primary-colored, the rest are secondary).
- "Load more" for further groups; a "Getting started ▾" view switcher top-right.
- "More resources to help you master Apollo" — 3 illustrated cards (Academy / webinars / help docs) each with a button.
- Completing a task fires a success **toast** ("Onboarding task completed! You earned 5 credits!") with an action link.
- **Ours:** "Welcome back", 3 stat tiles, 4 quick-action chips, an email verifier, recent-activity table. Functional but nothing guides a new user through the product; the one-time `GuidedTour` overlay is the only onboarding and it's fire-and-forget.

### 1.3 The search screens (Find people / Find companies) — the core product surface

**Filter rail (~290px, left):**
- Segmented counts at the top: **Total 196 · Net New 196 · Saved 0**.
- Filter groups as an **accordion**: icon · label · active-count pill (`× 2`, click = clear that group) · chevron; a small dot marks groups with active filters.
- Expanded group shows applied values as **removable chips** (`Finance manager ×`) under sub-labels ("Include titles:", "Company Keywords Contain ANY Of:", "Industry:").
- 15+ groups (Job Titles, Company, Location, Industry & Keywords, Email Status, # Employees, Market Segments, SIC/NAICS, AI Filters, Buying Intent, Website Visitors …); locked 🔒 groups (Lookalikes) as upsell.
- Sticky footer: **Clear all 9** · **View 60+ Filters**. Hover tooltips ("Open Industry & Keywords Filter").
- **Ours:** 224px panel, 4 checkbox groups with counts, "Clear all filters" text link. No active-count per group, no chips, no accordion, no text filters (job title, company name), no employee range, no email-status filter.

**Controls row above the table:** view switcher ("Default view ▾") · **Hide Filters 9** toggle · search box · *right:* Research with AI · Create workflow · **Save as new search** · **Relevance ▾** sort · Search settings · **Import ▾**.
- **Ours:** title + one search input + Export CSV.

**Results table:**
- **Bulk-select checkbox** column → bulk actions.
- NAME as an underlined link; COMPANY with a **logo/favicon**; EMAILS and PHONE NUMBERS as icon buttons (`✉ Access email`, `📞 Access Mobile`) — the monetized action is a real button, not a text link; QUALIFY CONTACT as an AI column (`▷ Click to run`); **+ Add column** at the header's right edge; sticky header; horizontal scroll.
- Companies: NAME + logo, ACTIONS `+ Save`, LINKS row of social icons (site/LinkedIn/Facebook/X), NUMBER OF EMPLOYEES pill, INDUSTRY chip.
- Pagination: `‹ [1 ▾] ›  1 – 30 of 196`.
- Contextual nudge toast bottom-right ("Solid list, but not all are worth reaching out to. Want me to prioritize the best ones?").
- **Ours:** plain 7-column table, no checkboxes, no logos, "Reveal" is a ghost text button, "Previous / Next" pagination, no sort, no column management, no saved views.

### 1.4 Empty states are designed, not text

Every empty screen has the same anatomy: **illustration → one-line headline → one or two sentences of guidance → 1–2 CTAs → "ⓘ Learn more" link**. Examples: Lists ("Welcome to your lists" + *Create a people list / Create a company list*), Sequences (embedded 1:05 video + "Create your first sequence" + *✨ Create with AI / Create sequence* + collapsible "More sequence resources"), Emails (an illustrated mock of the domain-health table + "No emails yet." + *View domains* + a tip row), Data enrichment ("Build your data health center dashboard" + *Works with HubSpot / Salesforce* + *Connect CRM ▾ / Save contacts* + a 3-up "Key benefits" strip), Tasks ("You have no assigned tasks" + *View all team tasks / New task*), Saved people ("0 records", "Try adjusting your search or filters…" + *Reset filters*), Calls analytics (KPI grid all at 0 / 0% with ⓘ tooltips and ↗ deep-links + a skeleton table reading "No data yet").

- **Ours:** a single muted sentence inside the table body ("No lists yet — save contacts or companies from search to start one.").

### 1.5 Banners, toasts, tooltips — a real feedback system

- **Info banner** (cool grey, ⓘ, dismissible ×): "Bounce Guard will be on by default… You can adjust… in *Settings › …*".
- **Warning banner** (amber-brown, ⚠) with a right-aligned action link: "Set up your AI context center… *Get started*", "You have no mailboxes linked… *Link mailbox*".
- **Success toast** top-right (green ✓, title + body + action link + ×).
- ⓘ tooltips on every metric tile; hover tooltips on filter groups.
- **Ours:** errors are red inline text; no toasts, no banners, no tooltips beyond `title=` attributes.

### 1.6 Page header pattern

Title (+ optional `0 records` sub-line) · **underline sub-tabs** with count pills (All tasks **0** · Call tasks **0** · Overdue **0**; All Sequences · Analytics · Diagnostics; Data health center · CRM **New** · CSV · Job change alerts) · top-right **primary CTA** (`Create sequence`, `+ Create task`, `+ Create person`, `Automate Enrichment ▾`) and a tertiary one (`View scheduled jobs 0`, `Import ▾`). Below it a consistent **toolbar**: view switcher · Show Filters **1** · search · Sort **1** · View options · Save as new view.

- **Ours:** title + one button; no tabs, no toolbar.

### 1.7 Visual system

- Near-neutral **dark** UI (≈#0f0f0f bg, ≈#171717 cards), 1px low-contrast borders, 3-step grey type hierarchy, **13–14px body**, compact density (~52px table rows), **small radii (6–8px)**.
- **One accent** (yellow-green ≈#e9f57c) reserved for *the* primary action per screen; purple reserved for AI features; **semantic color only for status** (🛈 Fix = red, ⚠ Review = amber, ✓ Good = green).
- Every action button carries a 16px line icon; icons are one consistent family.
- **Ours:** purple gradient on primary *and* secondary actions *and* badges, 12–16px radii, looser density, purple-tinted dark surfaces (`#14001d`), Montserrat at 14–16px. It reads as "brand-forward marketing" rather than "dense professional tool" once you're inside the app.

### 1.8 Things Apollo does that we should **not** copy (honesty)

- Nav entries for features we don't have (Calls, Meetings, Conversations, Deals, Workflows, Website visitors, Forms, Emails-inbox). Grouped nav is the goal — padded with fake entries is not.
- "Connect CRM", "Install Chrome extension", "Research with AI", AI Qualify columns — CRM sync and the extension are explicitly deferred in `TODO.md`; AI columns would be a whole product. The *slot* those sit in (toolbar right side, AI-accent purple) is worth reserving; the features are not.
- Mobile-number reveal — we don't source phone numbers; don't render an "Access Mobile" button.

---

## 2. TODO — phased, in recommended order

Phase 1 is the biggest perceived-quality jump per hour and unblocks everything
after it (the shell components get reused by every later phase).

> **Status (2026-08-22):** All five phases shipped and are live on
> titans7.com. Notes on what deviated from the spec below: 1.4's Settings
> link waits on Phase 5 (there's no settings page yet); 2.1's "Saved" count in
> the rail was dropped (no cheap endpoint — `/dashboard/stats` now returns
> `savedContacts` if it's wanted later); 2.3's column sorting is a toolbar
> Sort control rather than clickable headers. Phase 3: the checklist's
> "complete profile" task was dropped (the Profile page is read-only — nothing
> to complete) and "raise a support ticket" was dropped (rewarding that would
> manufacture tickets) in favour of *Save a search*, *Take the product tour*
> (replayable via `?tour=1`) and *Open a company profile*, which are real,
> detectable actions; "invite a teammate" is shown greyed as coming soon. Group
> bonus is +10 (not +25) so 9 tasks × 5 + 3 groups × 10 lands exactly on the
> agreed 75-credit total. 3.4's "publish docs/FEATURES.md" became a proper
> user-facing Help page (`/app/help`) — the internal doc has file paths and
> not-built tables, which aren't for customers. The route-level code split
> (TODO.md) shipped alongside: the first-load bundle went from ~280 KB gzip to
> ~108 KB, with marketing, app and admin chunks loaded per audience.
> Phase 4: 4.2/4.3 were already done in Phase 1; 4.4's analytics tab is a
> workspace roll-up (`GET /sequences/analytics`); 4.5's ListDetail now *is*
> the search table (ContactRow with reveal + phone). Phase 5: *Users & teams*
> lists seats but invites stay honestly disabled until the P0 ships;
> *Security* got change-password (and first-set for Google-only accounts) —
> forgot-password (the unauthenticated flow) is still the P0. 5.2's admin-
> style flyout was dropped in favour of a plain Settings link + the page's
> own sub-nav + ⌘K entries for every section.
> Everything else below is done as written.

### Phase 1 — App shell & design system foundation ✅

- [x] **1.1 Pick the in-app visual direction** (decision, not code — see Open
      questions): neutral-dark + single accent vs. today's purple-ink dark;
      flat single-color primary vs. today's gradient. Encode the answer as
      tokens in `index.css`/`tailwind.config.js` *for the `/app` tree only*
      (marketing keeps its editorial look).
- [x] **1.2 Icon set** — adopt `lucide-react` (tree-shakeable, one family),
      replace the hand-rolled SVGs in `AppLayout`/`AdminLayout`/`FacetPanel`.
- [x] **1.3 Grouped, collapsible sidebar** — groups: *Prospect* (People,
      Companies, Lists), *Engage* (Sequences), *Account* (Billing, Profile),
      *Support* (Tickets, with the answered-count badge we just built).
      Every item gets an icon; groups remember collapsed state
      (localStorage); collapse-to-rail toggle (icons only, tooltip on hover);
      `New` pill support for future items.
- [x] **1.4 Sidebar bottom stack** (Upgrade card + onboarding card shipped; Settings link → Phase 5) — **Upgrade** card (FREE/BASIC plans only,
      reads plan from billing summary, links to `/app/billing`), **Onboarding
      hub** progress card (% from Phase 3's checklist; hidden once 100%),
      **Settings** link.
- [x] **1.5 Top bar** — left: sidebar toggle + breadcrumb/page title; center:
      **⌘K command palette** (people/companies/lists/sequences/tickets search
      + "go to" navigation + quick actions like "New list", "New sequence";
      `cmdk`-style, fully keyboard-driven); right: **credits pill** (reuse
      CreditBadge, restyled), **notification bell** (dropdown fed by the
      answered-tickets query + billing events; red dot when unread), avatar
      menu (existing ProfileMenu).
- [x] **1.6 Feedback primitives** — `<Banner variant="info|warning|success">`
      (dismissible, optional right-aligned action link, persisted dismissal
      by key), `<Toast>` system (top-right stack, auto-dismiss, action link)
      wired through a tiny store so any mutation can fire one, `<Tooltip>`
      (Radix or Floating UI) for ⓘ metric hints and icon-only buttons.
      Replace every inline `text-red-600` error with the banner/toast as
      appropriate.
- [x] **1.7 `<PageHeader>`** — title · optional sub-line (`196 records`) ·
      underline **sub-tabs** with count pills · primary + tertiary action
      slots · optional description; and **`<Toolbar>`** — filter toggle with
      count, search, sort, view options, right-side action slot. Migrate
      every `/app` page onto these two.
- [x] **1.8 Density/type pass** — 13–14px body inside `/app`, 6–8px radii on
      in-app surfaces, 48–52px table rows, consistent 12px label caps
      (`text-[11px] uppercase tracking-wide`).

### Phase 2 — Search screens (People / Companies) ✅

- [x] **2.1 Filter rail redesign** — accordion `<FilterGroup>` (icon · label ·
      active-count pill with ×-to-clear · chevron · active dot), applied
      values as removable chips, sticky footer **Clear all N**, top segmented
      **Total / Saved** counts (Saved = contacts this workspace has revealed
      — `EmailReveal` — or added to a list).
- [x] **2.2 More filters** — *frontend-only:* job-title text contains,
      company-name text contains, location; *needs backend/ES:* # employees
      range (Company has headcount? verify in `searchService`), email status
      (verified / unverified / not found — from `Contact.email` +
      `emailVerified`), tech-stack keywords (`Company.techStack` exists).
      Add each as an ES filter + facet in `searchService.js`.
- [x] **2.3 Results table upgrade** — **bulk-select checkbox** column + a
      floating **bulk action bar** (Add N to list · Export N · Reveal N —
      reveal shows total credit cost and confirms); **company logo** cell
      (letter-avatar fallback; optional favicon by domain — see Open
      questions); NAME as link → contact/company detail; **sortable
      headers**; sticky `<thead>`; horizontal scroll container; "+ Add
      column" popover to toggle optional columns (Department, Seniority,
      Location, LinkedIn, Revealed-on).
- [x] **2.4 Reveal as a real button** — `✉ Access email · 2 cr` primary-ish
      icon button; after reveal, email cell shows the address + a ✓ verified
      pill and a copy-to-clipboard icon; error → toast.
- [x] **2.5 Pagination** — `‹ [page ▾] ›  1–25 of 196` + page-size selector
      (25/50/100), replacing Previous/Next.
- [x] **2.6 Saved searches** — `Save as new search` → name it, appears in a
      "Saved searches" dropdown in the toolbar and under the filter rail.
      *Needs backend:* `SavedSearch { id, workspaceId, type, name, filters
      Json }` + CRUD route.
- [x] **2.7 Companies parity** — same rail/table/bulk treatment; LINKS cell
      (website · LinkedIn) with icons; EMPLOYEES pill; INDUSTRY chip;
      `+ Save` → add to company list.
- [x] **2.8 Empty/loading** — skeleton rows while fetching (not
      "Searching…"); designed empty state ("0 people match" + *Reset
      filters*).

### Phase 3 — Dashboard → Getting-started hub ✅

- [x] **3.1 Onboarding checklist** — grouped tasks with real completion
      detection from existing data: *Find your first contacts* (run a people
      search · reveal an email · add a contact to a list · save a search) ·
      *Reach out* (create a sequence · activate it · enroll a contact — shown
      plan-locked on Free) · *Know your way around* (verify email — already
      done · take the product tour · open a company profile · invite a
      teammate ⟵ greyed "coming soon", gated on the invites P0). Progress
      bar; the *next* task's CTA is primary; completed rows collapse. Drives
      the sidebar Onboarding-hub card (hidden at 100%). `GET
      /dashboard/onboarding`, `OnboardingTaskCompletion`.
- [x] **3.2 Credit rewards** — +5 per task, +10 per completed group, 75 max,
      as `ONBOARDING_REWARD` ledger rows (a new reason so the ledger reads
      honestly), paid exactly once under a guarded update. Success toast
      with a deep link to the checklist; credits pill refreshes.
- [x] **3.3 Stat tiles** — Credits / **Reveals this month** / **Credits used
      this month** / Active sequences / Saved lists, each with ⓘ + ↗. (`GET
      /dashboard/stats`; sparklines still later.)
- [x] **3.4 Resources strip** — "Read the guide" (→ new in-app `/app/help`,
      also in the sidebar under Support and in ⌘K), "How credits work" (→
      `/app/help#credits`, prices read from the API), "Talk to us" (→ new
      ticket). EmailVerifier moved to a **Tools** tab on Home.
- [x] **3.5 "Getting started / Overview / Tools" tabs** — `?view=` deep
      links; Home defaults to Overview once the checklist reads 100%.

### Phase 4 — Empty states, detail pages, polish ✅

- [x] **4.1 `<EmptyState>`** component (illustration · headline · body ·
      primary/secondary CTA · learn-more) and use it on Lists, ListDetail,
      Sequences, Tickets, Billing transactions, search results, audit log.
      Illustrations: a small set of on-brand line illustrations (one per
      object type) — SVG, themed via `currentColor`.
- [x] **4.2 Skeleton loaders** everywhere `Loading…` appears today.
- [x] **4.3 Status pill system** — one `<StatusPill tone="neutral|success|
      warning|danger|info">` used for sequence status, ticket status, plan,
      email-verified, audit actions; drop the ad-hoc `bg-emerald-500/15`
      strings.
- [x] **4.4 Sequences** — sub-tabs *All sequences · Analytics*; designed
      empty state with two CTAs; analytics tab = KPI grid (sent / opened /
      clicked / replied / bounced with ⓘ) + per-sequence table.
- [x] **4.5 Lists** — designed empty state (*Create a people list / Create a
      company list*), list cards or table with type icon + item count + last
      updated; ListDetail gets the same table upgrade as search.
- [x] **4.6 Tickets** — sub-tabs with count pills (Active **n** · Answered
      **n** · Closed **n**), status pills, designed empty state.
- [x] **4.7 Billing** — plan overview card (current plan · renewal · seats ·
      ⓘ), credits usage bar, transactions table with status pills and a
      designed empty state.

### Phase 5 — Settings area ✅ (invites / forgot-password still P0)

- [x] **5.1 `/app/settings`** with a left sub-nav: *Profile* (existing
      Profile page), *Workspace* (name, plan overview → Billing), *Users &
      teams* (⟵ **blocked on team/seat invites P0**), *Security* (change
      password ⟵ **pairs with password-reset P0**; connected Google
      account), *Notifications* (marketing opt-out toggle — we have
      `marketingOptOut`), *Integrations* (honest "nothing yet" state).
- [x] **5.2 Sidebar "Settings" link + the admin-style flyout** listing those
      sections.

---

## 3. Decisions (taken 2026-08-22)

1. **In-app theme** — neutral near-black / near-white surfaces inside `/app`,
   grey text hierarchy, **purple as the only accent**. Implemented as a
   scoped token override (`.app-shell { --dp-* }`) so the marketing site and
   Login keep their purple-ink look untouched.
2. **Primary button** — flat solid primary; the brand **gradient is reserved
   for the single hero action per screen** (e.g. "Create sequence", the
   Upgrade card). Everything else flat / outline / ghost.
3. **Onboarding credit rewards** — **yes**: +5 credits per task, +10 on
   completing a group (9 rewarded tasks + 3 groups = exactly the agreed 75
   per workspace, which is also enforced as a hard cap), written as
   `ONBOARDING_REWARD` ledger rows so they show in transaction history under
   their own name.
4. **Company logos** — letter-avatars (deterministic color from the name),
   no external favicon service — zero third-party requests per row.
5. **Scope** — **Phase 1 + 2 first**, ship, review live, then decide on 3–5.
