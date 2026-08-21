import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { HeroDemo } from '../../components/marketing/HeroDemo.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { AmbientCanvas } from '../../components/marketing/AmbientCanvas.jsx';
import { MaskedLines } from '../../components/marketing/MaskedLines.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { StatCounter } from '../../components/marketing/StatCounter.jsx';
import { ScrollSteps } from '../../components/marketing/ScrollSteps.jsx';
import { Marquee } from '../../components/marketing/Marquee.jsx';
import { SmoothScroll } from '../../components/marketing/SmoothScroll.jsx';
import { EditorialChapter } from '../../components/marketing/EditorialChapter.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';

const MARQUEE_ITEMS = [
  'Verified reveals',
  'Atomic credit ledger',
  'Multi-step sequences',
  'Company search',
  'Saved lists',
  'CSV export',
  'Workspace roles',
];

const CHAPTERS = [
  {
    n: '01',
    eyebrow: 'Search & reveal',
    title: 'Every contact, verified before you spend a credit',
    desc: 'Filter by title, seniority, department, and company signal across a live database. Results stay masked until you reveal them — so you never pay for a guess, and once anyone on your team reveals a contact, the whole workspace can see it for free.',
    points: [
      'Pattern-based email finding plus verification',
      'Atomic credit ledger — never double-charged, even under load',
      'Workspace-wide reveals, not per-seat',
    ],
    mockup: <AnimatedRevealMockup />,
  },
  {
    n: '02',
    eyebrow: 'Outreach',
    title: 'Sequences that keep working after the first email',
    desc: "Build multi-step cadences with wait steps, enroll a list in one click, and pause or resume without losing a contact's place in the sequence.",
    points: [
      'Email and wait steps in any order',
      'Enroll straight from a saved list',
      'Suppression list enforced automatically on every send',
    ],
    mockup: <AnimatedSequenceMockup />,
  },
  {
    n: '03',
    eyebrow: 'Credits & billing',
    title: 'A credit ledger you can actually audit',
    desc: 'Every credit movement is an append-only ledger entry — monthly grants, reveals, and top-ups. Reserve-then-commit accounting means a burst of concurrent reveals can never push your balance negative.',
    points: [
      'Full transaction history, not just a balance',
      'Buy more credits any time from your profile',
      'Auto-refund on a failed or expired reveal',
    ],
    mockup: <AnimatedCreditLedgerMockup />,
  },
];

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
      <SmoothScroll />
      <MarketingNav />

      {/* Hero — art-directed masked lines with staggered indents */}
      <section id="product" className="relative isolate overflow-hidden bg-ink-950 text-white">
        <AmbientCanvas />
        <div className="relative mx-auto flex min-h-[92vh] max-w-[1400px] flex-col justify-center px-6 py-28">
          <div className="flex items-start justify-between">
            <FadeIn as="div" whileInView={false}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
                B2B sales intelligence
              </span>
            </FadeIn>
            <FadeIn
              as="div"
              whileInView={false}
              delay={0.2}
              className="hidden text-right text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500 sm:block"
            >
              <p>Search · Reveal · Outreach</p>
              <p className="mt-1.5">One credit ledger</p>
            </FadeIn>
          </div>

          <MaskedLines
            as="h1"
            delay={0.2}
            className="mt-10 text-[clamp(2.9rem,9vw,9rem)] font-extrabold uppercase leading-[0.92] tracking-tight"
            lines={[
              { content: 'Find verified' },
              {
                content: (
                  <span className="bg-gradient-brand bg-clip-text text-transparent">
                    contacts.
                  </span>
                ),
                className: 'sm:ml-[8vw]',
              },
              { content: 'Track buying' },
              { content: <span className="text-outline">signals.</span>, className: 'sm:ml-[16vw]' },
            ]}
          />

          <div className="mt-14 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <FadeIn as="p" whileInView={false} delay={0.9} className="max-w-[460px] text-lg text-ink-300">
              DataPit is the search, reveal, and outreach platform for teams who'd rather spend
              credits on real contacts than guess at spreadsheets.
            </FadeIn>
            <FadeIn as="div" whileInView={false} delay={1.05} className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
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
            </FadeIn>
          </div>

          <FadeIn
            as="div"
            whileInView={false}
            delay={1.3}
            className="mt-16 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500"
          >
            Scroll
            <span className="relative block h-px w-20 bg-white/15">
              <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse rounded-full bg-mauve-magic" />
            </span>
          </FadeIn>
        </div>

        {/* Ticker band */}
        <Marquee
          items={MARQUEE_ITEMS}
          className="relative border-t border-white/10 py-5 text-sm font-bold uppercase tracking-[0.2em] text-ink-300"
        />
      </section>

      {/* Manifesto — one big scrubbed statement */}
      <section className="mx-auto max-w-[1200px] px-6 py-32 sm:py-40">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Why DataPit</p>
        <ScrubHeadline
          as="h2"
          className="mt-8 max-w-[1000px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
        >
          Most sales tools charge you before they've found anything. Here, the money only moves
          when the data does.
        </ScrubHeadline>
      </section>

      {/* Live walkthrough */}
      <section className="border-y border-border bg-surface">
        <FadeIn as="div" className="mx-auto max-w-[880px] px-6 py-24 sm:py-28">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Live product walkthrough
          </p>
          <HeroDemo className="mx-auto mt-10 max-w-[560px]" />
        </FadeIn>
      </section>

      {/* Numbered chapters */}
      {CHAPTERS.map((chapter, i) => (
        <EditorialChapter key={chapter.n} {...chapter} alt={i % 2 === 1} />
      ))}

      {/* 04 — everything else */}
      <section className="relative overflow-hidden border-y border-border bg-surface">
        <span
          aria-hidden="true"
          className="text-outline pointer-events-none absolute -top-8 right-2 select-none text-[clamp(8rem,22vw,20rem)] font-extrabold leading-none sm:right-6"
        >
          04
        </span>
        <div className="relative mx-auto max-w-[1200px] px-6 py-28 sm:py-36">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            04 — And the rest
          </p>
          <ScrubHeadline
            as="h2"
            className="mt-6 max-w-[820px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
          >
            Everything else a go-to-market team needs
          </ScrubHeadline>
          <Stagger as="div" className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {SECONDARY_FEATURES.map((f) => (
              <StaggerItem
                key={f.title}
                as="div"
                className="rounded-lg border border-border bg-surface-elevated p-6 shadow-dp transition-transform duration-150 ease-brand hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-action text-white">
                  <f.icon />
                </div>
                <h3 className="mt-4 text-base font-bold text-text">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Stats band — every number true by construction, never usage claims */}
      <section className="bg-ink-950 text-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-14 px-6 py-28 sm:grid-cols-3 sm:py-36">
          <div>
            <StatCounter
              value={2}
              className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums"
            />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">
              Credits per verified reveal
            </p>
          </div>
          <div>
            <StatCounter
              value={100}
              className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums"
            />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">
              Free credits every month
            </p>
          </div>
          <div>
            <StatCounter
              value={0}
              prefix="$"
              className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums"
            />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">
              To start — no card required
            </p>
          </div>
        </div>
      </section>

      {/* How it works — scroll-pinned on desktop, plain grid elsewhere */}
      <ScrollSteps eyebrow="How it works" steps={STEPS} />

      <GiantCTA title="Start finding your next customers." />

      <MarketingFooter />
    </div>
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
