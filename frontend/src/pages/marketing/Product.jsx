import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedSearchMockup } from '../../components/marketing/AnimatedSearchMockup.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { PageHero } from '../../components/marketing/PageHero.jsx';
import { EditorialChapter } from '../../components/marketing/EditorialChapter.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { SmoothScroll } from '../../components/marketing/SmoothScroll.jsx';

const MODULES = [
  {
    n: '01',
    eyebrow: 'Search',
    title: 'A live database, not a stale export',
    desc: 'Filter people by title, seniority, and department, or companies by industry, headcount, and tech stack. Facet counts update as you narrow the query, so you always know how big your list is before you spend a credit on it.',
    points: [
      'Faceted people & company search',
      'Masked results until reveal',
      'Facet counts update live',
    ],
    mockup: <AnimatedSearchMockup />,
  },
  {
    n: '02',
    eyebrow: 'Reveal',
    title: 'Pay for contacts, not guesses',
    desc: "Pattern-based email finding runs automatically, verification confirms deliverability, and the credit only leaves your balance once there's a usable result. Reveal once and it's visible to your whole workspace from then on.",
    points: [
      "Verified before you're charged",
      'Atomic reserve-then-commit — no double charges',
      'Shared across the workspace, not per-seat',
    ],
    mockup: <AnimatedRevealMockup />,
  },
  {
    n: '03',
    eyebrow: 'Sequences',
    title: 'Outreach that runs itself between touches',
    desc: "Chain email and wait steps into a cadence, enroll a saved list in one click, and let the engine handle timing. Pause and resume without losing a contact's place, and suppression is enforced automatically on every send.",
    points: [
      'Email + wait steps in any order',
      'Enroll straight from a list',
      'Automatic suppression-list enforcement',
    ],
    mockup: <AnimatedSequenceMockup />,
  },
  {
    n: '04',
    eyebrow: 'Credits & billing',
    title: 'A ledger you can actually reconcile',
    desc: 'Every credit movement — monthly grants, reveals, top-ups — is an append-only ledger entry. Reserve-then-commit accounting means concurrent reveals can never push a balance negative, and a failed reveal auto-refunds.',
    points: [
      'Full transaction history',
      'Reserve → commit/refund accounting',
      'Buy more credits any time',
    ],
    mockup: <AnimatedCreditLedgerMockup />,
  },
];

export function Product() {
  return (
    <div className="min-h-screen bg-bg">
      <SmoothScroll />
      <MarketingNav />

      <PageHero
        eyebrow="Product"
        lines={[
          { content: 'One workspace,' },
          { content: 'four things that', className: 'sm:ml-[6vw]' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">
                move pipeline.
              </span>
            ),
          },
        ]}
        sub="No bundled modules you'll never touch. Search, reveal, sequence, and pay for it all on one credit ledger."
      />

      {MODULES.map((mod, i) => (
        <EditorialChapter key={mod.n} {...mod} alt={i % 2 === 1} />
      ))}

      <GiantCTA title="See it on your own data." />

      <MarketingFooter />
    </div>
  );
}
