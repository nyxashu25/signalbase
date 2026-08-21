import { Link } from 'react-router-dom';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { HeroDemo } from '../../components/marketing/HeroDemo.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { AmbientCanvas } from '../../components/marketing/AmbientCanvas.jsx';
import { SplitHeadline } from '../../components/marketing/SplitHeadline.jsx';
import { StatCounter } from '../../components/marketing/StatCounter.jsx';
import { ScrollSteps } from '../../components/marketing/ScrollSteps.jsx';
import { Parallax } from '../../components/marketing/Parallax.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';

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
      <section id="product" className="relative isolate overflow-hidden bg-ink-950 text-white">
        <AmbientCanvas />
        <div className="relative mx-auto max-w-[1100px] px-6 pb-20 pt-28 sm:pb-28 sm:pt-36">
          <FadeIn as="div" whileInView={false} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-mauve-magic">
              B2B sales intelligence
            </span>
          </FadeIn>

          <SplitHeadline
            as="h1"
            delay={0.15}
            className="mt-8 text-balance text-center text-6xl font-extrabold leading-[1.03] tracking-tight sm:text-7xl lg:text-8xl"
          >
            Find verified contacts.
            <br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Track buying signals.
            </span>
          </SplitHeadline>

          <FadeIn
            as="p"
            whileInView={false}
            delay={0.9}
            className="mx-auto mt-8 max-w-[560px] text-center text-lg text-ink-300"
          >
            DataPit is the search, reveal, and outreach platform for teams who'd rather spend
            credits on real contacts than guess at spreadsheets.
          </FadeIn>

          <FadeIn
            as="div"
            whileInView={false}
            delay={1.05}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
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

          <FadeIn
            as="div"
            whileInView={false}
            delay={1.2}
            className="mx-auto mt-16 flex max-w-[560px] flex-wrap items-start justify-center gap-x-12 gap-y-6 border-t border-white/10 pt-10"
          >
            <StatBlock>
              <StatCounter value={2} className="text-3xl font-extrabold tabular-nums text-white" />
              <span className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                credits per verified reveal
              </span>
            </StatBlock>
            <StatBlock>
              <StatCounter
                value={100}
                className="text-3xl font-extrabold tabular-nums text-white"
              />
              <span className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                free credits every month
              </span>
            </StatBlock>
            <StatBlock>
              <span className="text-3xl font-extrabold text-white">$0</span>
              <span className="mt-1 text-xs uppercase tracking-wide text-ink-500">
                to start, no card required
              </span>
            </StatBlock>
          </FadeIn>
        </div>

        {/* Live product walkthrough */}
        <FadeIn as="div" className="relative mx-auto max-w-[880px] px-6 pb-24 sm:pb-32">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-mauve-magic">
            Live product walkthrough
          </p>
          <HeroDemo className="mx-auto mt-8 max-w-[560px]" />
        </FadeIn>
      </section>

      {/* Feature: People search + reveal */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <Stagger as="div" className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2" staggerDelay={0.15}>
          <StaggerItem as="div">
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
          </StaggerItem>
          <StaggerItem as="div">
            <Parallax amount={28}>
              <AnimatedRevealMockup />
            </Parallax>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Feature: Sequences */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <Stagger as="div" className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2" staggerDelay={0.15}>
            <StaggerItem as="div" className="order-2 lg:order-1">
              <Parallax amount={28}>
                <AnimatedSequenceMockup />
              </Parallax>
            </StaggerItem>
            <StaggerItem as="div" className="order-1 lg:order-2">
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
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* Feature: Credits */}
      <section className="mx-auto max-w-[1200px] px-6 py-24">
        <Stagger as="div" className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2" staggerDelay={0.15}>
          <StaggerItem as="div">
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
          </StaggerItem>
          <StaggerItem as="div">
            <Parallax amount={28}>
              <AnimatedCreditLedgerMockup />
            </Parallax>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Secondary features grid */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <FadeIn as="div" className="mx-auto max-w-[640px] text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
              Everything else a go-to-market team needs
            </h2>
          </FadeIn>
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

      {/* How it works — scroll-pinned on desktop, plain grid elsewhere */}
      <ScrollSteps eyebrow="How it works" steps={STEPS} />

      {/* CTA band */}
      <section className="mx-auto max-w-[1200px] px-6 pb-24">
        <FadeIn as="div" className="rounded-xl bg-gradient-action px-8 py-16 text-center text-white sm:px-16">
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
        </FadeIn>
      </section>

      <MarketingFooter />
    </div>
  );
}

function StatBlock({ children }) {
  return <div className="flex flex-col items-center text-center">{children}</div>;
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
