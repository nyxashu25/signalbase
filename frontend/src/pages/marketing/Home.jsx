import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { HeroDemo } from '../../components/marketing/HeroDemo.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { AmbientCanvas } from '../../components/marketing/AmbientCanvas.jsx';
import { SplitHeadline } from '../../components/marketing/SplitHeadline.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { StatCounter } from '../../components/marketing/StatCounter.jsx';
import { ScrollSteps } from '../../components/marketing/ScrollSteps.jsx';
import { Parallax } from '../../components/marketing/Parallax.jsx';
import { Marquee } from '../../components/marketing/Marquee.jsx';
import { SmoothScroll } from '../../components/marketing/SmoothScroll.jsx';
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

// The numbered editorial chapters — each one full-bleed, with an oversized
// index number and a scroll-scrubbed title, in the style of the reference
// sites' service sections.
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

      {/* Hero — full-viewport editorial type over the ambient canvas */}
      <section id="product" className="relative isolate overflow-hidden bg-ink-950 text-white">
        <AmbientCanvas />
        <div className="relative mx-auto flex min-h-[92vh] max-w-[1400px] flex-col justify-center px-6 py-28">
          <FadeIn as="div" whileInView={false}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
              B2B sales intelligence
            </span>
          </FadeIn>

          <SplitHeadline
            as="h1"
            delay={0.15}
            className="mt-8 text-[clamp(2.9rem,8.5vw,8.5rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
          >
            Find verified contacts.
            <br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Track buying signals.
            </span>
          </SplitHeadline>

          <div className="mt-12 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
            <FadeIn as="p" whileInView={false} delay={0.9} className="max-w-[480px] text-lg text-ink-300">
              DataPit is the search, reveal, and outreach platform for teams who'd rather spend
              credits on real contacts than guess at spreadsheets.
            </FadeIn>
            <FadeIn as="div" whileInView={false} delay={1.05} className="flex shrink-0 flex-col gap-3 sm:flex-row">
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
        <section
          key={chapter.n}
          className={`relative overflow-hidden ${i % 2 === 1 ? 'border-y border-border bg-surface' : ''}`}
        >
          <span
            aria-hidden="true"
            className="text-outline pointer-events-none absolute -top-8 right-2 select-none text-[clamp(8rem,22vw,20rem)] font-extrabold leading-none sm:right-6"
          >
            {chapter.n}
          </span>
          <div className="relative mx-auto max-w-[1200px] px-6 py-28 sm:py-36">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {chapter.n} — {chapter.eyebrow}
            </p>
            <ScrubHeadline
              as="h2"
              className="mt-6 max-w-[820px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
            >
              {chapter.title}
            </ScrubHeadline>
            <div className="mt-14 grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
              <FadeIn as="div" className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <p className="text-base leading-relaxed text-text-muted">{chapter.desc}</p>
                <ul className="mt-8 flex flex-col text-sm text-text">
                  {chapter.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-3 border-t border-border py-4 last:border-b"
                    >
                      <CheckIcon />
                      <span className="font-medium">{p}</span>
                    </li>
                  ))}
                </ul>
              </FadeIn>
              <FadeIn as="div" delay={0.15} className={i % 2 === 1 ? 'lg:order-1' : ''}>
                <Parallax amount={32}>{chapter.mockup}</Parallax>
              </FadeIn>
            </div>
          </div>
        </section>
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

      {/* Giant footer CTA */}
      <section className="relative isolate overflow-hidden border-t border-border bg-ink-950 text-white">
        <AmbientCanvas />
        <Link
          to="/login?mode=register"
          className="group relative mx-auto block max-w-[1400px] px-6 py-32 sm:py-44"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-mauve-magic">
            Free to start · No credit card required
          </p>
          <ScrubHeadline
            as="h2"
            className="mt-8 text-[clamp(2.6rem,8vw,8rem)] font-extrabold uppercase leading-[0.95] tracking-tight"
          >
            Start finding your next customers.
          </ScrubHeadline>
          <span className="mt-12 inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-white">
            Start free
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-action transition-transform duration-200 ease-brand group-hover:translate-x-2">
              <ArrowIcon />
            </span>
          </span>
        </Link>
      </section>

      <MarketingFooter />
    </div>
  );
}

function CheckIcon() {
  return (
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
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
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
