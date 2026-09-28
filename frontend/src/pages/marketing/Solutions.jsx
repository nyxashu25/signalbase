import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { RoleAccent } from '../../components/marketing/RoleAccent.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { TiltCard } from '../../components/marketing/TiltCard.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { Stagger, StaggerItem } from '../../components/marketing/motion.jsx';
import { BILLING_INTERVALS, FREE_PLAN_MONTHLY_CREDITS } from '../../data/plans.js';
import { CREDIT_COSTS, LIVE, formatCount } from '../../data/facts.js';

// Each card's accent is a small illustration: the counters and rings show
// values that are true by construction (prices and rules from data/), never
// usage or results; the bars are a decorative sketch with no numbers.
const ANNUAL_DISCOUNT = Math.round(BILLING_INTERVALS.find((i) => i.key === 'YEAR').discount * 100);

const ROLES = [
  {
    title: 'Sales leaders',
    desc: 'Sales leaders get one workspace and one bill for the whole team. On paid plans, admins see what each teammate spent credits on and can export it to CSV.',
    icon: IconChart,
    accent: { type: 'bars', label: 'Credit spend by teammate' },
  },
  {
    title: 'Account executives',
    desc: `Account executives can find the right contact without losing an afternoon. Search by title and seniority, then reveal only the people worth a real conversation${
      LIVE.sequenceSending ? ' and drop them straight into a sequence' : ' and save them to a list'
    }.`,
    icon: IconTarget,
    accent: { type: 'counter', label: 'Credits per reveal in the app', value: CREDIT_COSTS.REVEAL },
  },
  {
    title: 'Sales development',
    desc: LIVE.sequenceSending
      ? `SDRs can build a list, enroll it in a sequence and let wait steps handle the timing between touches. Enrollment costs ${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits per contact.`
      : 'SDRs can build prospect lists quickly: filter people, reveal the ones you want and save them to a named list. A contact one teammate reveals is free for the rest.',
    icon: IconSend,
    accent: { type: 'ring', label: 'Teammates who can see a reveal', value: 100 },
  },
  {
    title: 'Revenue operations',
    desc: 'RevOps gets a credit ledger with a row for each grant and charge, so reconciling is a read, not a project. Owner, Admin and Member roles keep access in check.',
    icon: IconGear,
    accent: { type: 'counter', label: 'Workspace roles', value: 3 },
  },
  {
    title: 'Marketers',
    desc: `Marketers can see how big a list is before spending a credit. Filter companies by industry, headcount and location, then export the list for ${CREDIT_COSTS.CSV_EXPORT} credits a file.`,
    icon: IconMegaphone,
    accent: { type: 'counter', label: 'Credits per CSV export', value: CREDIT_COSTS.CSV_EXPORT },
  },
  {
    title: 'Founders',
    desc: `Founders can start on the free plan with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month and reveal their first prospects the same day. Upgrade once you need a team, not before.`,
    icon: IconRocket,
    accent: { type: 'ring', label: 'Off with annual billing', value: ANNUAL_DISCOUNT },
  },
];

export function Solutions() {
  return (
    <div className="min-h-screen">
      <StoryCover
        station="crystals"
        eyebrow="Solutions"
        narration="DataPit serves six roles on a sales team, from founders to RevOps. Each opens the book to a different page."
        sub="Here is how each role uses the same DataPit workspace to find people and reveal work emails. Same search, same credits, a different reason to open it."
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
