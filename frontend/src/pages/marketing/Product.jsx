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
import { FREE_PLAN_MONTHLY_CREDITS } from '../../data/plans.js';
import { CREDIT_COSTS, LIVE, formatCount } from '../../data/facts.js';

// What a reveal gives back when a contact has no email on file: a
// first.last@domain guess, checked only when a verifier is configured.
const GUESS_SENTENCE = LIVE.emailVerification
  ? 'When no email is on file, DataPit checks a first.last guess, and a guess the verifier rejects costs nothing.'
  : 'When no email is on file, you get a first.last guess, charged like any reveal.';

// The sequences chapter renders only once sequence sending is live in
// production (data/facts.js LIVE). Numbers and sides are assigned after the
// filter, so the remaining chapters still count 01, 02… and alternate.
const MODULES = [
  {
    eyebrow: 'Search',
    narration: 'Search people and companies for free, and watch the counts change as you filter. Every deal starts with a question.',
    title: 'Narrow the list before you spend a credit',
    desc: 'Filter people by job title, seniority and department, or companies by industry, headcount and location. Facet counts update as you narrow the query. Searching is free, so you know how big your list is before you reveal anyone.',
    points: ['Faceted people and company search', 'Masked results until you reveal', 'Facet counts update as you filter'],
    plate: <AnimatedSearchMockup />,
    station: 'lens',
  },
  {
    eyebrow: 'Reveal',
    narration: `Reveal a contact's work email for ${CREDIT_COSTS.REVEAL} credits. Nothing leaves your balance until you choose who.`,
    title: 'Reveal a contact once for the whole team',
    desc: `A reveal shows the work email DataPit holds for a contact, for ${CREDIT_COSTS.REVEAL} credits in the app or ${CREDIT_COSTS.EXTENSION_REVEAL} from the Chrome extension. ${GUESS_SENTENCE} Reveal once and your whole workspace sees it from then on.`,
    points: [
      'Credits are held first, then charged when the reveal completes',
      'No double charge when two teammates reveal at once',
      'Shared across the workspace, not per seat',
    ],
    plate: <AnimatedRevealMockup />,
    station: 'reveal',
  },
  LIVE.sequenceSending && {
    eyebrow: 'Sequences',
    narration: 'Sequences email your enrolled contacts on the schedule you set. Between one touch and the next, the engine keeps the timing.',
    title: 'Outreach that runs itself between touches',
    desc: `Chain email and wait steps into a sequence, then enroll contacts from a saved list for ${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits each. The engine sends each step when it's due. Pause and resume a contact without losing their place.`,
    points: ['Email and wait steps in any order', 'Enroll straight from a list', 'Pause and resume each contact'],
    plate: <AnimatedSequenceMockup />,
    station: 'sequence',
  },
  {
    eyebrow: 'Credits & billing',
    narration: 'Your credit history shows each grant and charge as its own row. Reconciling becomes a read, not a project.',
    title: 'A credit ledger you can see, row by row',
    desc: 'Each monthly grant, reveal, company view, export and top-up is a row in your credit history. Admins on paid plans see spend for each teammate and can export it to CSV. Credits are held before a reveal runs, so concurrent reveals can never push a balance below zero.',
    points: ['Full transaction history', 'Held credits come back if a reveal fails', 'Buy more credits any time'],
    plate: <AnimatedCreditLedgerMockup />,
    station: 'ledger',
  },
]
  .filter(Boolean)
  .map((mod, i) => ({
    ...mod,
    n: String(i + 1).padStart(2, '0'),
    align: i % 2 === 0 ? 'left' : 'right',
  }));

const COVER_NARRATION = LIVE.sequenceSending
  ? 'Search, reveal, sequences and a credit ledger, in one workspace. Turn the page for each chapter.'
  : 'Search, reveal and a credit ledger, in one workspace. Turn the page for each chapter.';

const COUNT_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

export function Product() {
  return (
    <div className="min-h-screen">
      <StoryCover
        station="mark"
        eyebrow="Product"
        narration={COVER_NARRATION}
        sub="DataPit puts prospecting in one workspace. Search people and companies, reveal work email addresses for credits, and save prospects to lists you can export. A ledger you can see tracks your credits. No bundled modules you'll never touch."
        lines={[
          { content: 'One workspace,' },
          // The chapter count changes with LIVE flags (sequences are gated).
          { content: `${COUNT_WORDS[MODULES.length] ?? MODULES.length} things that`, className: 'sm:ml-[6vw]' },
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

      <GiantCTA station="tunnel" title={`Try it with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} free credits.`} />

      <MarketingFooter />
    </div>
  );
}
