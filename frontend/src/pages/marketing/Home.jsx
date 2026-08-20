import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { HeroDemo } from '../../components/marketing/HeroDemo.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';

const SECONDARY_FEATURES = [
  {
    title: 'Company search',
    desc: 'Firmographic and technographic filtering with live facet counts, so you narrow a list of thousands down to the accounts that matter.',
    icon: IconBuilding,
  },
  {
    title: 'Lists',
    desc: 'Save contacts and companies into named lists you can build sequences and exports from.',
    icon: IconList,
  },
  {
    title: 'Role-based access',
    desc: 'Owner, Admin, and Member roles per workspace, with every query scoped to your org — no cross-tenant leakage.',
    icon: IconShield,
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

      {/* Hero */}
      <section id="product" className="relative overflow-hidden bg-ink-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 50% at 15% 0%, rgba(148,0,222,0.35), transparent), radial-gradient(50% 40% at 100% 20%, rgba(190,61,255,0.25), transparent)',
          }}
        />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-16 px-6 py-24 sm:py-28 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
              B2B sales intelligence
            </span>
            <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Find verified contacts.
              <br />
              <span className="bg-gradient-brand bg-clip-text text-transparent">
                Track buying signals.
              </span>
            </h1>
            <p className="mt-6 max-w-[520px] text-lg text-ink-300">
              DataPit is the search, reveal, and outreach platform for teams who'd rather spend
              credits on real contacts than guess at spreadsheets.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login?mode=register"
                className="rounded-md bg-gradient-action px-7 py-3.5 text-center text-sm font-bold text-white shadow-[0_14px_32px_rgba(148,0,222,0.4)] transition-transform duration-150 ease-brand hover:-translate-y-px"
              >
                Start free
              </Link>
              <Link
                to="/pricing"
                className="rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-center text-sm font-bold text-white transition-colors duration-150 ease-brand hover:bg-white/10"
              >
                See pricing
              </Link>
            </div>
            <p className="mt-5 text-xs text-ink-500">
              No credit card required &middot; 100 free credits every month
            </p>
          </div>

          <HeroDemo className="lg:translate-x-4" />
        </div>
      </section>

      {/* Feature: People search + reveal */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              Search &amp; reveal
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Every contact, verified before you spend a credit
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-muted">
              Filter by title, seniority, department, and company signal across a live database.
              Results stay masked until you reveal them — so you never pay for a guess, and once
              anyone on your team reveals a contact, the whole workspace can see it for free.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-text">
              <FeatureCheck>Pattern-based email finding plus verification</FeatureCheck>
              <FeatureCheck>
                Atomic credit ledger — never double-charged, even under load
              </FeatureCheck>
              <FeatureCheck>Workspace-wide reveals, not per-seat</FeatureCheck>
            </ul>
          </div>
          <AnimatedRevealMockup />
        </div>
      </section>

      {/* Feature: Sequences */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <AnimatedSequenceMockup />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                Outreach
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                Sequences that keep working after the first email
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-muted">
                Build multi-step cadences with wait steps, enroll a list in one click, and pause or
                resume without losing a contact's place in the sequence.
              </p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-text">
                <FeatureCheck>Email and wait steps in any order</FeatureCheck>
                <FeatureCheck>Enroll straight from a saved list</FeatureCheck>
                <FeatureCheck>Suppression list enforced automatically on every send</FeatureCheck>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Credits */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-primary">
              Credits &amp; billing
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              A credit ledger you can actually audit
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-muted">
              Every credit movement is an append-only ledger entry — monthly grants, reveals, and
              top-ups. Reserve-then-commit accounting means a burst of concurrent reveals can never
              push your balance negative.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-text">
              <FeatureCheck>Full transaction history, not just a balance</FeatureCheck>
              <FeatureCheck>Buy more credits any time from your profile</FeatureCheck>
              <FeatureCheck>Auto-refund on a failed or expired reveal</FeatureCheck>
            </ul>
          </div>
          <AnimatedCreditLedgerMockup />
        </div>
      </section>

      {/* Secondary features grid */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="mx-auto max-w-[640px] text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Everything else a go-to-market team needs
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SECONDARY_FEATURES.map((f) => (
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
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
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
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24">
        <div className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start finding your next customers
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-base text-white/85">
            Free to start. No credit card required.
          </p>
          <Link
            to="/login?mode=register"
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

function FeatureCheck({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="mt-0.5 shrink-0 text-primary"
      >
        <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
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

function IconShield() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
