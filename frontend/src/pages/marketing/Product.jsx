import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedSearchMockup } from '../../components/marketing/AnimatedSearchMockup.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';

const MODULES = [
  {
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
      <MarketingNav />

      <section className="border-b border-border bg-surface">
        <Stagger as="div" whileInView={false} staggerDelay={0.1} className="mx-auto max-w-[900px] px-6 py-20 text-center">
          <StaggerItem as="span" className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            Product
          </StaggerItem>
          <StaggerItem as="h1" className="mt-5 text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            One workspace, four things that actually move a pipeline
          </StaggerItem>
          <StaggerItem as="p" className="mx-auto mt-5 max-w-[600px] text-base text-text-muted">
            No bundled modules you'll never touch. Search, reveal, sequence, and pay for it all on
            one credit ledger.
          </StaggerItem>
        </Stagger>
      </section>

      {MODULES.map((mod, i) => (
        <section key={mod.eyebrow} className={i % 2 === 1 ? 'bg-surface' : ''}>
          <div className="mx-auto max-w-[1200px] px-6 py-20">
            <Stagger as="div" className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2" staggerDelay={0.15}>
              <StaggerItem as="div" className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <span className="text-xs font-bold uppercase tracking-wide text-primary">
                  {mod.eyebrow}
                </span>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-text">
                  {mod.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-text-muted">{mod.desc}</p>
                <ul className="mt-6 flex flex-col gap-3 text-sm text-text">
                  {mod.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="mt-0.5 shrink-0 text-primary"
                      >
                        <path
                          d="M5 12.5l4.5 4.5L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </StaggerItem>
              <StaggerItem as="div" className={i % 2 === 1 ? 'lg:order-1' : ''}>
                {mod.mockup}
              </StaggerItem>
            </Stagger>
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <FadeIn as="div" className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            See it on your own data
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
        </FadeIn>
      </section>

      <MarketingFooter />
    </div>
  );
}
