import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';

const FEATURES = [
  {
    title: 'People search',
    desc: 'Faceted search over contacts by title, seniority, department, and geography. Emails stay masked until you spend a credit to reveal them.',
    icon: IconSearch,
  },
  {
    title: 'Company search',
    desc: 'Firmographic and technographic filtering with live facet counts, so you narrow a list of thousands down to the accounts that matter.',
    icon: IconBuilding,
  },
  {
    title: 'Verified email reveal',
    desc: 'Pattern-based finding plus verification, gated by an atomic credit ledger — reveal once, and the whole workspace sees it.',
    icon: IconMail,
  },
  {
    title: 'Lists',
    desc: 'Save contacts and companies into named lists you can build sequences and exports from.',
    icon: IconList,
  },
  {
    title: 'Sequences',
    desc: 'Multi-step outreach cadences with wait steps, enrollment from lists, and pause/resume control.',
    icon: IconSend,
  },
  {
    title: 'Credits & billing',
    desc: 'An append-only ledger with reserve-then-commit accounting, so concurrent reveals can never over-spend your balance.',
    icon: IconCredit,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Find verified contacts',
    desc: 'Search by role, seniority, and company signal until you have a list worth pursuing.',
  },
  {
    n: '02',
    title: 'Reveal what you need',
    desc: 'Spend a credit only on the contacts you actually want to reach — nothing is charged up front.',
  },
  {
    n: '03',
    title: 'Track buying signals',
    desc: 'Enroll into a sequence, keep lists organized, and watch replies come back into one workspace.',
  },
];

export function Home() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />

      <section id="product" className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 50% at 15% 0%, rgba(148,0,222,0.35), transparent), radial-gradient(50% 40% at 100% 20%, rgba(190,61,255,0.25), transparent)',
          }}
        />
        <div className="relative mx-auto max-w-[1120px] px-6 py-24 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
            B2B sales intelligence
          </span>
          <h1 className="mx-auto mt-6 max-w-[820px] text-balance text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
            Find verified contacts.
            <br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Track buying signals.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-lg text-ink-300">
            DataPit is the search, reveal, and outreach platform for teams who'd rather spend
            credits on real contacts than guess at spreadsheets.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="rounded-md bg-gradient-action px-7 py-3.5 text-sm font-bold text-white shadow-[0_14px_32px_rgba(148,0,222,0.4)] transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              Start free
            </Link>
            <Link
              to="/pricing"
              className="rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-colors duration-150 ease-brand hover:bg-white/10"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-24">
        <div className="mx-auto max-w-[640px] text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Everything a go-to-market team needs, in one workspace
          </h2>
          <p className="mt-4 text-base text-text-muted">
            No bundled modules you don't use. Search, reveal, and outreach on one credit ledger.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-surface-elevated p-6 shadow-dp transition-transform duration-150 ease-brand hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-action text-white">
                <f.icon />
              </div>
              <h3 className="mt-4 text-base font-bold text-text">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1120px] px-6 py-24">
          <div className="mx-auto max-w-[640px] text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n}>
                <span className="text-sm font-extrabold text-primary">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold text-text">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1120px] px-6 py-24">
        <div className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start finding your next customers
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-base text-white/85">
            Free to start. No credit card required.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block rounded-md bg-white px-7 py-3.5 text-sm font-bold text-primary transition-transform duration-150 ease-brand hover:-translate-y-px"
          >
            Start free
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}

function IconSearch() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="11" cy="11" r="7" strokeLinecap="round" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="4" y="3" width="12" height="18" rx="1.5" />
      <path d="M9 8h2M9 12h2M9 16h2M16 11h4v10h-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.25" />
      <circle cx="3.5" cy="12" r="1.25" />
      <circle cx="3.5" cy="18" r="1.25" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M21 3L3 10.5l7.5 3L14 21l7-18z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCredit() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" strokeLinecap="round" />
      <path d="M7 15h4" strokeLinecap="round" />
    </svg>
  );
}
