# DataPit — B2B Sales Intelligence Platform

An Apollo.io / Slintel / 6sense-style sales intelligence platform built with **Node.js + Express**
on the backend and **React + Vite** on the frontend. It demonstrates the full architecture of a
modern go-to-market data product: a searchable contact & company database, **credit-gated email
reveal / enrichment**, **buying-intent scoring**, **lists**, and **automated outreach sequences**.

> This is a reference implementation / scaffold. Email verification (Hunter.io), outbound send
> (SendGrid), transactional mail (Resend), and Stripe checkout all call real provider APIs once
> configured, and simulate otherwise — so the whole thing runs locally with seed data either way.
> Technographics, intent/buying-signal scoring, CRM sync, and the Chrome extension mentioned below
> and in `ARCHITECTURE.md` are product-direction sketches, not built — see
> [`docs/FEATURES.md`](./docs/FEATURES.md) for the file-by-file built-vs-not-built accounting.

---

## ✨ Features

| Area | What it does |
|---|---|
| **People search** | Faceted search over contacts by title, seniority, department, geography, and the company's tech stack. Emails are **masked** in results. |
| **Email reveal** | The monetized action. Spends a credit, runs pattern-based finding + verification, returns a verified email. |
| **Company search** | Firmographic + technographic + intent filtering with facet counts. |
| **Account 360** | Company profile: firmographics, tech stack, intent signals, funding history, contacts. |
| **Intent scoring** | Weighted score across intent topics, funding recency, and signal recency → Hot / Warm / Cool. |
| **Lists** | Save contacts/companies into named lists. |
| **Sequences** | Multi-step email cadences with wait steps, enroll lists, pause/resume, funnel analytics. |
| **Credits & billing** | Append-only credit ledger with reserve → commit/refund accounting; plans & checkout (stubbed). |
| **Auth & tenancy** | JWT access/refresh, org → workspace → user model with roles. |

See `docs/FEATURES.md` for the full list mapped to Apollo/Slintel equivalents.

---

## 🏗 Architecture

```
                         ┌──────────────┐
   React + Vite  ───────▶│  Express API │──────▶ PostgreSQL  (source of truth, Prisma)
   (RTK Query)           │  /api/v1     │──────▶ Elasticsearch (search projection)
                         │              │──────▶ Redis (cache, sessions, rate-limit, BullMQ)
                         └──────┬───────┘
                                │ enqueue
                                ▼
                         ┌──────────────┐
                         │ BullMQ Worker│  enrichment · ES indexing · sequence cadence engine
                         └──────────────┘
```

- **PostgreSQL** is the system of record (Prisma schema in `backend/prisma/schema.prisma`).
- **Elasticsearch** holds a denormalized projection for fast faceted search; Postgres rows are
  hydrated after the ES query and **masked** before returning.
- **Redis** backs sessions/refresh tokens, rate limiting, credit reservations, and the BullMQ queue.
- **Worker** handles async enrichment, ES (re)indexing, and the time-based sequence engine.

Full write-ups and **Mermaid diagrams** are in [`/docs`](./docs):
`01-system-architecture`, `02-er-diagram`, `03-data-enrichment-flow`, `04-search-flow`,
`05-user-journey`, `06-sequence-engine`, `07-credits-state`, `08-deployment`, plus
`ARCHITECTURE.md`, `DATA-MODEL.md`, and `API-SPEC.md`.

> Tip: paste any `.mermaid` file into <https://mermaid.live> to view the diagram.

---

## 🚀 Quick start (Docker — everything at once)

```bash
docker compose up --build
# wait until the api/elasticsearch are healthy, then in another terminal:
docker compose exec api npm run prisma:migrate   # create tables
docker compose exec api npm run seed             # sample data + demo user
```

- Web app: <http://localhost:5173>
- API: <http://localhost:4000/api/v1>
- **Demo login:** `demo@datapit.io` / `demo1234`

## 🛠 Quick start (manual / dev)

Prereqs: Node 20+, PostgreSQL, Redis, Elasticsearch 8 running locally.

```bash
# 1. Backend
cd backend
cp .env.example .env          # adjust DATABASE_URL / REDIS_URL / ELASTICSEARCH_URL
npm install
npm run prisma:migrate
npm run seed                  # seeds 40 companies, contacts, and the demo user
npm run dev                   # API on :4000
npm run worker                # (separate terminal) background jobs

# 2. Frontend
cd ../frontend
npm install
npm run dev                   # Vite on :5173 (proxies /api → :4000)
```

---

## 📁 Repository layout

```
sales-intel-platform/
├── ARCHITECTURE.md             # master architecture doc
├── docker-compose.yml          # full local stack
├── docs/                       # mermaid diagrams + data model + API spec + features
├── backend/
│   ├── prisma/schema.prisma    # full relational data model
│   └── src/
│       ├── config/             # env, db, redis, elasticsearch clients
│       ├── middleware/         # auth, errors, rate-limit, credit reservation
│       ├── services/           # search, credit, email finder/verifier, enrichment, intent
│       ├── controllers/        # request handlers per resource
│       ├── routes/             # /api/v1 router
│       ├── jobs/               # BullMQ queues, indexer, worker (cadence engine)
│       ├── validators/         # zod schemas
│       └── utils/seed.js       # sample data + demo user
└── frontend/
    └── src/
        ├── api/                # RTK Query slices (auth, search, company, list, sequence, billing)
        ├── store/              # redux store + auth slice
        ├── components/         # FacetPanel, ContactRow, UI primitives
        ├── layouts/            # AppLayout (sidebar + topbar)
        └── pages/              # Login, Dashboard, People, Companies, Profile, Lists, Sequences, Billing
```

---

## 🔑 How the credit flow works (the core money mechanic)

1. A reveal request hits `reserveCredits('emailReveal')` middleware → atomically **reserves** the
   credit in Redis (fails fast with `402` if balance is insufficient).
2. The controller runs enrichment (find + verify the email).
3. On a usable result it **commits** — writes a negative row to the append-only `CreditLedger`.
4. On no result it **releases** — the reservation is dropped and nothing is charged (auto-refund).

Balance is always `monthlyGrant + SUM(ledger.delta) − reserved`, so it can never be over-spent by
concurrent requests. State diagram: `docs/07-credits-state.mermaid`.

---

## ⚠️ Notes

- Email verification (Hunter.io) and sequence sends (SendGrid) call the real provider API once
  `EMAIL_VERIFIER_API_KEY` / `ESP_API_KEY` are set in `.env`, and simulate otherwise. Stripe and
  CRM sync are still **interface stubs** — wire a real key and implement the marked TODO spots.
- Pattern-based email guessing is real; verification is `checked: false` until a key is configured.
- This project is for learning/demonstration of the architecture, not production deployment as-is.
