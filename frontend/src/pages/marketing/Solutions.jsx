import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { RoleAccent } from '../../components/marketing/RoleAccent.jsx';

const ROLES = [
  {
    title: 'Sales leaders',
    desc: "See where pipeline is actually coming from. Every reveal and every sequence send rolls up to a workspace-wide credit ledger, so you can see what your team is spending and what it's producing without asking for a spreadsheet.",
    icon: IconChart,
    accent: { type: 'bars', label: 'Team credit spend this week' },
  },
  {
    title: 'Account executives',
    desc: 'Stop losing an afternoon to finding the right contact. Search by title and seniority, reveal only the people worth a real conversation, and drop them straight into a sequence.',
    icon: IconTarget,
    accent: { type: 'counter', label: 'Contacts revealed today', value: 12 },
  },
  {
    title: 'Sales development',
    desc: 'Build a list, enroll it, and let wait steps handle the timing between touches. Suppression is enforced automatically, so you never have to manually track who unsubscribed.',
    icon: IconSend,
    accent: { type: 'ring', label: 'Sequence completion', value: 76 },
  },
  {
    title: 'Revenue operations',
    desc: 'One append-only ledger for every credit movement means reconciliation is a query, not a project. Role-based access keeps every workspace scoped to its own org.',
    icon: IconGear,
    accent: { type: 'counter', label: 'Ledger entries this month', value: 248 },
  },
  {
    title: 'Marketers',
    desc: 'Firmographic and technographic filters narrow a total-addressable-market list to the accounts that actually match your ideal customer profile, before a single credit is spent.',
    icon: IconMegaphone,
    accent: { type: 'ring', label: 'ICP match rate', value: 82 },
  },
  {
    title: 'Founders',
    desc: "Start on the free plan, reveal your first real prospects the same day, and upgrade only once you're actually running out of credits — not before.",
    icon: IconRocket,
    accent: { type: 'counter', label: 'Minutes to first reveal', value: 4 },
  },
];

export function Solutions() {
  return (
    <div className="min-h-screen bg-bg">
      <MarketingNav />

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[900px] px-6 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Solutions
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            Built for whoever's actually chasing the number
          </h1>
          <p className="mx-auto mt-5 max-w-[600px] text-base text-text-muted">
            The same workspace, the same credit ledger — just a different reason to open it every
            morning.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-border bg-surface-elevated p-6 shadow-dp transition-transform duration-150 ease-brand hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-action text-white">
                <r.icon />
              </div>
              <h3 className="mt-4 text-base font-bold text-text">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{r.desc}</p>
              <RoleAccent {...r.accent} />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-24">
        <div className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Find out what it looks like for your role
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

function IconChart() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
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
function IconGear() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M3 11v2a2 2 0 002 2h1l3 5V4L6 9H5a2 2 0 00-2 2z" strokeLinejoin="round" />
      <path d="M14 8a4 4 0 010 8M18 5a8 8 0 010 14" strokeLinecap="round" />
    </svg>
  );
}
function IconRocket() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M12 2c2 2 4 6 4 10-1 1-2.5 2-4 2s-3-1-4-2c0-4 2-8 4-10z" strokeLinejoin="round" />
      <path d="M8 15l-3 3 2 2 3-3M16 15l3 3-2 2-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="1.5" />
    </svg>
  );
}
