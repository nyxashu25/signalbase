import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { RoleAccent } from '../../components/marketing/RoleAccent.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { TiltCard } from '../../components/marketing/TiltCard.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { Stagger, StaggerItem } from '../../components/marketing/motion.jsx';

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
    <div className="min-h-screen">
      <StoryCover
        station="crystals"
        eyebrow="Solutions"
        narration="Six readers, one book. Each opens it to a different page."
        sub="The same workspace, the same credit ledger — just a different reason to open it every morning."
        lines={[
          { content: "Built for whoever's" },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">chasing the number.</span>
            ),
            className: 'sm:ml-[6vw]',
          },
        ]}
      />

      <section
        data-chapter
        data-chapter-title="Roles"
        data-station="city"
        data-station-side="0"
        className="relative py-6 sm:py-10"
      >
        <div className="mx-auto max-w-[1248px] px-3 sm:px-6">
          <div className="story-glass relative overflow-hidden text-text">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: 'linear-gradient(180deg, rgba(231,179,255,0.2), transparent)' }}
            />
            <div className="relative mx-auto max-w-[1200px] px-6 py-20 sm:py-28">
              <p className="story-eyebrow text-xs font-bold uppercase tracking-[0.22em]">Chapter 01 — Who it's for</p>
              <Stagger as="div" className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ROLES.map((r) => (
                  <StaggerItem key={r.title} as="div">
                    <TiltCard className="h-full p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-action text-white shadow-[0_8px_20px_rgba(148,0,222,0.35)]">
                        <r.icon />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-text">{r.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">{r.desc}</p>
                      <RoleAccent {...r.accent} />
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
      </section>

      <GiantCTA station="mark" title="Find out what it looks like for your role." />

      <MarketingFooter />
    </div>
  );
}

function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}
function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 3L3 10.5l7.5 3L14 21l7-18z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 11v2a2 2 0 002 2h1l3 5V4L6 9H5a2 2 0 00-2 2z" strokeLinejoin="round" />
      <path d="M14 8a4 4 0 010 8M18 5a8 8 0 010 14" strokeLinecap="round" />
    </svg>
  );
}
function IconRocket() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 2c2 2 4 6 4 10-1 1-2.5 2-4 2s-3-1-4-2c0-4 2-8 4-10z" strokeLinejoin="round" />
      <path d="M8 15l-3 3 2 2 3-3M16 15l3 3-2 2-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="1.5" />
    </svg>
  );
}
