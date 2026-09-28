import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedSearchMockup } from '../../components/marketing/AnimatedSearchMockup.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { StoryChapter } from '../../components/marketing/StoryChapter.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { FaqSection } from '../../components/marketing/FaqSection.jsx';
import { PRODUCT_FAQS } from '../../data/faqs.js';

const MODULES = [
  {
    n: '01',
    eyebrow: 'Search',
    narration: 'The first page of every deal: a question, and a database that answers it live.',
    title: 'A live database, not a stale export',
    desc: 'Filter people by title, seniority, and department, or companies by industry, headcount, and tech stack. Facet counts update as you narrow the query, so you always know how big your list is before you spend a credit on it.',
    points: ['Faceted people & company search', 'Masked results until reveal', 'Facet counts update live'],
    plate: <AnimatedSearchMockup />,
    align: 'left',
    station: 'lens',
  },
  {
    n: '02',
    eyebrow: 'Reveal',
    narration: 'The credit only leaves your balance once there is something real behind it.',
    title: 'Pay for contacts, not guesses',
    desc: "Pattern-based email finding runs automatically, verification confirms deliverability, and the credit only leaves your balance once there's a usable result. Reveal once and it's visible to your whole workspace from then on.",
    points: ["Verified before you're charged", 'Atomic reserve-then-commit — no double charges', 'Shared across the workspace, not per-seat'],
    plate: <AnimatedRevealMockup />,
    align: 'right',
    station: 'reveal',
  },
  {
    n: '03',
    eyebrow: 'Sequences',
    narration: 'Between one touch and the next, the engine keeps the timing.',
    title: 'Outreach that runs itself between touches',
    desc: "Chain email and wait steps into a cadence, enroll a saved list in one click, and let the engine handle timing. Pause and resume without losing a contact's place, and suppression is enforced automatically on every send.",
    points: ['Email + wait steps in any order', 'Enroll straight from a list', 'Automatic suppression-list enforcement'],
    plate: <AnimatedSequenceMockup />,
    align: 'left',
    station: 'sequence',
  },
  {
    n: '04',
    eyebrow: 'Credits & billing',
    narration: 'Reconciliation is a query, not a project.',
    title: 'A ledger you can actually reconcile',
    desc: 'Every credit movement — monthly grants, reveals, top-ups — is an append-only ledger entry. Reserve-then-commit accounting means concurrent reveals can never push a balance negative, and a failed reveal auto-refunds.',
    points: ['Full transaction history', 'Reserve → commit/refund accounting', 'Buy more credits any time'],
    plate: <AnimatedCreditLedgerMockup />,
    align: 'right',
    station: 'ledger',
  },
];

export function Product() {
  return (
    <div className="min-h-screen">
      <StoryCover
        station="mark"
        eyebrow="Product"
        narration="Four chapters, one workspace, one ledger underneath it all."
        sub="DataPit puts four tools in one workspace: people and company search, a reveal that unlocks work emails and phone numbers for credits, multi-step email sequences, and an append-only credit ledger. No bundled modules you'll never touch."
        lines={[
          { content: 'One workspace,' },
          { content: 'four things that', className: 'sm:ml-[6vw]' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">move pipeline.</span>
            ),
          },
        ]}
      />

      {MODULES.map((mod) => (
        <StoryChapter key={mod.n} {...mod} tone="deep" />
      ))}

      <FaqSection eyebrow="Questions" items={PRODUCT_FAQS} />

      <GiantCTA station="tunnel" title="See it on your own data." />

      <MarketingFooter />
    </div>
  );
}
