# Sales Intelligence Platform — System Architecture

A B2B sales-intelligence & engagement platform (an Apollo.io / Slintel / 6sense–style product)
built on **Node.js (Express)** + **React (Vite)**.

This document is the master reference. Companion docs:
- `docs/DATA-MODEL.md` — entities, relationships, schema rationale
- `docs/API-SPEC.md` — REST endpoints
- `docs/FEATURES.md` — feature-by-feature breakdown
- `docs/*.mermaid` — all flow charts / diagrams (render on GitHub or any Mermaid viewer)

---

## 1. What the product does

| Pillar | Description |
|---|---|
| **Company Database** | Millions of company records: firmographics, revenue, headcount, location, industry. |
| **People (Contact) Database** | Decision-maker records: name, title, seniority, department, verified email & phone. |
| **Search & Filters** | Faceted search across companies/people with 50+ filters, saved searches. |
| **Data Enrichment** | Take a partial record (domain / name) and fill in the rest from the data graph + 3rd-party providers. |
| **Email Finder + Verifier** | Discover and validate work emails (SMTP, MX, catch-all checks). |
| **Technographics** | What software/tech stack a company runs (from web scraping + signals). |
| **Intent / Buying Signals** | Topic-level intent scores, job-change alerts, funding events, hiring spikes. |
| **Lists & CRM** | Save leads to lists, push to Salesforce/HubSpot, track ownership. |
| **Sequences (Engagement)** | Multi-step email/call/task cadences with scheduling, A/B, analytics. |
| **Credits & Billing** | Metered consumption (reveal email = 1 credit), plans, usage caps. |
| **Teams & RBAC** | Orgs, workspaces, roles, seat management. |
| **Chrome Extension** | Surface contact data on LinkedIn / any company website. |

---

## 2. High-level architecture

```
                         ┌──────────────────────────────────────────────┐
                         │                   CLIENTS                      │
                         │   React SPA   •   Chrome Extension   •   API   │
                         └───────────────────────┬──────────────────────┘
                                                 │ HTTPS / JSON
                                        ┌────────▼─────────┐
                                        │   API Gateway /  │
                                        │   Load Balancer  │  (Nginx / ALB)
                                        └────────┬─────────┘
                                                 │
                    ┌────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
            ┌───────▼────────┐          ┌─────────▼────────┐         ┌──────────▼─────────┐
            │  API Service   │          │  Search Service  │         │  Engagement Svc    │
            │ (Express REST) │          │ (ES query layer) │         │ (sequences/email)  │
            └───┬────────┬───┘          └────────┬─────────┘         └──────────┬─────────┘
                │        │                       │                              │
                │        │                       │                              │
   ┌────────────▼──┐  ┌──▼───────────┐   ┌───────▼────────┐          ┌──────────▼─────────┐
   │  PostgreSQL   │  │    Redis     │   │ Elasticsearch  │          │   Job Queue (Bull) │
   │ (source of    │  │ cache +      │   │ (search index  │          │   + Workers        │
   │  truth, OLTP) │  │ rate limit   │   │  for co/people)│          └──────────┬─────────┘
   └───────────────┘  │ + sessions)  │   └────────────────┘                     │
                      └──────────────┘                              ┌───────────▼──────────┐
                                                                    │  Worker Pool          │
                                                                    │  • Enrichment         │
                                                                    │  • Email verify       │
                                                                    │  • CRM sync           │
                                                                    │  • Sequence sender    │
                                                                    │  • ES indexer         │
                                                                    └───────────┬──────────┘
                                                                                │
                       ┌────────────────────────────────────────────────────────┘
                       │
            ┌──────────▼───────────────────────────────────────────────────────┐
            │                       EXTERNAL DATA PROVIDERS                       │
            │  email finder APIs • technographics crawlers • intent data feeds   │
            │  CRM (Salesforce/HubSpot) • ESP (SendGrid/SES) • billing (Stripe)  │
            └────────────────────────────────────────────────────────────────────┘
```

See `docs/01-system-architecture.mermaid` for the rendered version.

---

## 3. Technology choices & rationale

| Layer | Choice | Why |
|---|---|---|
| Runtime | **Node.js 20** | One language across stack; great for I/O-heavy API + many 3rd-party calls. |
| API framework | **Express** | Mature, minimal, easy middleware composition. |
| Source-of-truth DB | **PostgreSQL** | Relational data (companies↔people↔lists↔users) needs joins, constraints, transactions. |
| ORM | **Prisma** | Type-safe schema, migrations, readable queries. |
| Search | **Elasticsearch** | Faceted full-text + filtering at scale (the core "find leads" experience). |
| Cache / queue broker | **Redis** | Caching, rate limits, session store, Bull queue backend. |
| Background jobs | **BullMQ** | Enrichment, verification, CRM sync, sequence sending are async + retryable. |
| Frontend | **React 18 + Vite** | Fast SPA; component-driven. |
| Client state | **Redux Toolkit + RTK Query** | Predictable global state + cached server data. |
| Styling | **Tailwind CSS** | Rapid, consistent UI. |
| Auth | **JWT (access + refresh)** | Stateless API auth; refresh tokens in Redis. |
| Email sending | **SendGrid / Amazon SES** | Deliverability + webhooks for opens/clicks. |
| Payments | **Stripe** | Subscriptions + metered credits. |
| Infra | **Docker + (ECS/K8s)** | Reproducible services; horizontal scale of workers. |

> **Why Postgres *and* Elasticsearch?** Postgres is the system of record (writes, money, relationships). Elasticsearch is a *read-optimized projection* of company/people data tuned for the search UX. Writes go to Postgres → a CDC/indexer job pushes them into ES.

---

## 4. Service responsibilities

- **API Service** — auth, CRUD on lists/contacts/companies, credits, billing, settings. The "front door."
- **Search Service** — translates UI filter state into Elasticsearch queries; returns paginated, faceted results. (Can live inside the API process or be split out under load.)
- **Engagement Service** — sequences engine: schedules steps, renders templates, sends through ESP, ingests open/click/reply webhooks.
- **Worker Pool** — consumes jobs:
  - `enrichment` — fill missing fields for a record.
  - `email-verify` — MX + SMTP + catch-all detection.
  - `crm-sync` — bi-directional push to Salesforce/HubSpot.
  - `sequence-send` — due-step processor.
  - `es-index` — keep Elasticsearch in sync with Postgres.

---

## 5. Core data flows (summary — see mermaid files for detail)

1. **Search flow** — `User filters → API → Search Service → Elasticsearch → hydrate from Postgres → return masked results (emails hidden until revealed)`.
2. **Reveal / enrich flow** — `User clicks "Access Email" → credits middleware checks balance → enrichment job → email finder + verifier → persist → decrement credit → return`.
3. **List → Sequence flow** — `Save contacts to list → add list to sequence → scheduler enqueues step jobs → ESP sends → webhooks update stats`.
4. **Intent flow** — `Provider feed → ingest worker → score per company/topic → surface as "hot accounts" + alerts`.

---

## 6. Cross-cutting concerns

- **Credits**: every data-reveal action is metered. A middleware reserves credits *before* the costly operation and commits/refunds based on outcome (e.g., a bad email refunds the credit).
- **Rate limiting**: per-user + per-IP token buckets in Redis.
- **Caching**: company profiles cached in Redis (TTL); search facets cached short-term.
- **Idempotency**: enrichment & CRM sync jobs keyed to avoid double-charging/duplicates.
- **Audit log**: who revealed which contact, when (compliance + analytics).
- **Data compliance**: GDPR/CCPA delete & suppression lists; opt-out registry; per-region storage notes.
- **Observability**: structured logs, request IDs, metrics (Prometheus), traces (OpenTelemetry).

---

## 7. Repository layout

```
sales-intel-platform/
├── ARCHITECTURE.md            ← this file
├── docker-compose.yml         ← local Postgres, Redis, Elasticsearch, API, web
├── docs/                      ← diagrams + specs
├── backend/                   ← Node.js / Express API + workers
│   ├── prisma/schema.prisma   ← the data model
│   └── src/
│       ├── config/            ← env, db, redis, es clients
│       ├── routes/            ← express routers
│       ├── controllers/       ← request handlers
│       ├── services/          ← business logic (search, enrichment, credits…)
│       ├── middleware/        ← auth, credits, rate-limit, errors
│       ├── jobs/              ← BullMQ processors
│       ├── validators/        ← request schema validation
│       └── utils/
└── frontend/                  ← React + Vite SPA
    └── src/
        ├── api/               ← RTK Query API slices
        ├── store/             ← redux store
        ├── pages/             ← screens (search, profile, lists, sequences…)
        ├── components/        ← reusable UI
        └── layouts/
```

---

## 8. Roadmap of phases (how you'd actually build it)

1. **MVP** — auth, company+people search (seeded data in ES), profiles, lists, manual credit counter.
2. **Enrichment** — email finder + verifier workers, credits middleware, audit log.
3. **Engagement** — sequences, ESP integration, open/click tracking.
4. **Integrations** — Salesforce/HubSpot sync, Chrome extension.
5. **Intelligence** — intent data, technographics, scoring, alerts.
6. **Scale** — split services, read replicas, ES sharding, multi-region.
