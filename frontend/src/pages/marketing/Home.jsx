import { Link } from 'react-router-dom';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { HeroDemo } from '../../components/marketing/HeroDemo.jsx';
import { AnimatedRevealMockup } from '../../components/marketing/AnimatedRevealMockup.jsx';
import { AnimatedSequenceMockup } from '../../components/marketing/AnimatedSequenceMockup.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { StoryChapter } from '../../components/marketing/StoryChapter.jsx';
import { Plate3D } from '../../components/marketing/Plate3D.jsx';
import { TiltCard } from '../../components/marketing/TiltCard.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { StatCounter } from '../../components/marketing/StatCounter.jsx';
import { ScrollSteps } from '../../components/marketing/ScrollSteps.jsx';
import { Marquee } from '../../components/marketing/Marquee.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { Magnetic } from '../../components/marketing/Magnetic.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';
import { FREE_PLAN_MONTHLY_CREDITS } from '../../data/plans.js';
import { CREDIT_COSTS, DATAPIT_SUMMARY, LIVE, formatCount } from '../../data/facts.js';

// Answer-first: what DataPit is, in the cover's first paragraph — the
// passage search snippets and AI answers lift. Kept to two sentences so the
// cover's CTAs stay clear of the mark's drag hint on phones.
const HOME_SUB = `${DATAPIT_SUMMARY} Start free with ${formatCount(FREE_PLAN_MONTHLY_CREDITS)} credits a month.`;

const MARQUEE_ITEMS = [
  'Work email reveals',
  'Credit ledger',
  LIVE.sequenceSending ? 'Multi-step sequences' : 'Chrome extension',
  'Company search',
  'Saved lists',
  'CSV export',
  'Workspace roles',
];

// What a reveal gives back when a contact has no email on file: a
// first.last@domain guess, checked only when a verifier is configured.
const GUESS_POINT = LIVE.emailVerification
  ? 'No email on file? A guess the verifier rejects costs nothing'
  : 'No email on file? You get a first.last guess, charged like any reveal';

// Chapters that describe sending email render only once sequence sending is
// live in production (data/facts.js LIVE), so the page never promises
// delivery that is only simulated. Numbers and sides are assigned after the
// filter, so the remaining chapters still count 01, 02… and alternate.
const CHAPTERS = [
  {
    eyebrow: 'Search & reveal',
    narration: 'Search people for free, then pay credits to see a work email. Nothing is charged for looking.',
    title: 'Search for free. Reveal the contacts you want.',
    desc: `Search people by job title, seniority, department and company at no cost. Results stay masked until you reveal one for ${CREDIT_COSTS.REVEAL} credits. Once anyone on your team reveals a contact, the whole workspace sees it for free.`,
    points: [
      GUESS_POINT,
      'No double charge when two teammates reveal at once',
      'Workspace-wide reveals, not per seat',
    ],
    plate: <AnimatedRevealMockup />,
    station: 'reveal',
  },
  LIVE.sequenceSending && {
    eyebrow: 'Outreach',
    narration: 'Sequences email your contacts on a schedule you set. The signal keeps moving after the first touch.',
    title: 'Sequences that keep working after the first email',
    desc: `Build a sequence of email and wait steps, then enroll contacts from a saved list. Enrollment costs ${formatCount(CREDIT_COSTS.SEQUENCE_ENROLLMENT)} credits per contact, charged up front. Pause or resume a contact without losing their place.`,
    points: [
      'Email and wait steps in any order',
      'Enroll straight from a saved list',
      'Pause or resume each contact',
    ],
    plate: <AnimatedSequenceMockup />,
    station: 'sequence',
  },
  {
    eyebrow: 'Credits & billing',
    narration: 'The ledger shows where your credits went. Every charge leaves a trace.',
    title: 'See where every credit went',
    desc: 'Your credit history lists each grant, reveal, company view, export and top-up as its own row. Admins on paid plans can see what each teammate spent. Credits are held before a reveal runs, so a burst of reveals can never push your balance below zero.',
    points: [
      'Full transaction history, not just a balance',
      'Top up credits any time from the Billing page',
      'Held credits come back if a reveal fails',
    ],
    plate: <AnimatedCreditLedgerMockup />,
    station: 'ledger',
  },
]
  .filter(Boolean)
  .map((chapter, i) => ({
    ...chapter,
    n: String(i + 1).padStart(2, '0'),
    align: i % 2 === 0 ? 'left' : 'right',
  }));

// The "And the rest" spread continues the chapter count.
const REST_NUMERAL = String(CHAPTERS.length + 1).padStart(2, '0');

// Follows HeroDemo's tour, which shows a sequence only once sending is live.
const WALKTHROUGH_NARRATION = LIVE.sequenceSending
  ? 'Watch one pass through the app: reveal a contact, save it to a list, filter companies, start a sequence and check your credits.'
  : 'Watch one pass through the app: reveal a contact, save it to a list, filter companies and check your credits.';

const SECONDARY_FEATURES = [
  {
    title: 'Company search',
    desc: `Filter companies by industry, headcount and location, with facet counts that update as you filter. Opening a company's full profile costs ${CREDIT_COSTS.COMPANY_VIEW} credits the first time your workspace views it.`,
    icon: IconBuilding,
  },
  {
    title: 'Lists',
    desc: `Save contacts and companies into named lists. Export a list to CSV for ${CREDIT_COSTS.CSV_EXPORT} credits a file; contacts you haven't revealed stay masked.`,
    icon: IconList,
  },
  {
    title: 'Role-based access',
    desc: 'Invite your team on a paid plan and give each person an Owner, Admin or Member role. Every query is scoped to your own workspace.',
    icon: IconShield,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Find the right people',
    desc: 'Search by role, seniority and company until you have a list worth pursuing. Searching costs nothing.',
    icon: StepFindGraphic,
  },
  {
    n: '02',
    title: 'Reveal what you need',
    desc: `Pay ${CREDIT_COSTS.REVEAL} credits to reveal each contact you want to reach. Your whole team can see it after that.`,
    icon: StepRevealGraphic,
  },
  {
    n: '03',
    title: 'Build your list',
    desc: LIVE.sequenceSending
      ? 'Save contacts to named lists, export them to CSV or enroll them in a sequence.'
      : `Save contacts to named lists and export them to CSV for ${CREDIT_COSTS.CSV_EXPORT} credits a file.`,
    icon: StepSignalsGraphic,
  },
];

export function Home() {
  return (
    <div className="min-h-screen">
      {/* Act I — the cover. */}
      <StoryCover
        size="lg"
        eyebrow="B2B contact data"
        narration="Search for the people you want to reach, then reveal their work email. The digging starts here."
        sub={HOME_SUB}
        lines={[
          { content: 'Find work' },
          {
            content: (
              <span className="bg-gradient-brand bg-clip-text text-transparent">emails.</span>
            ),
            className: 'sm:ml-[6vw]',
          },
          { content: 'Build prospect' },
          { content: <span className="text-outline">lists.</span>, className: 'sm:ml-[12vw]' },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Magnetic className="block">
            <Link
              to="/login?mode=register"
              className="block rounded-md bg-gradient-action px-7 py-3.5 text-center text-sm font-bold text-white shadow-[0_14px_32px_rgba(148,0,222,0.45)] transition-transform duration-150 ease-brand hover:-translate-y-px"
            >
              Start free
            </Link>
          </Magnetic>
          <Magnetic className="block">
            <Link
              to="/pricing"
              className="block rounded-md border border-white/20 bg-white/5 px-7 py-3.5 text-center text-sm font-bold text-white backdrop-blur transition-colors duration-150 ease-brand hover:bg-white/10"
            >
              See pricing
            </Link>
          </Magnetic>
        </div>
        <div className="mt-12 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
          Turn the page
          <span className="relative block h-px w-20 bg-white/15">
            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse rounded-full bg-mauve-magic" />
          </span>
        </div>
      </StoryCover>

      <Marquee
        items={MARQUEE_ITEMS}
        className="relative border-y border-white/10 py-5 text-sm font-bold uppercase tracking-[0.2em] text-ink-300"
      />

      {/* Prologue — one big scrubbed statement */}
      <section
        data-chapter
        data-chapter-title="Prologue"
        data-station="tunnel"
        data-station-side="0"
        className="relative text-white"
      >
        <div className="mx-auto max-w-[1200px] px-6 py-32 sm:py-44">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mauve-magic">Prologue — Why DataPit</p>
          <ScrubHeadline
            as="h2"
            className="mt-8 max-w-[1000px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight"
          >
            Searching and filtering cost nothing. You spend credits when you reveal a contact, open
            a company or export a list.
          </ScrubHeadline>
        </div>
      </section>

      {/* Act II — the chapters, each turning in 3D */}
      {CHAPTERS.map((chapter) => (
        <StoryChapter key={chapter.n} {...chapter} tone="deep" />
      ))}

      {/* Interlude — the live walkthrough */}
      <section
        data-chapter
        data-chapter-title="Walkthrough"
        data-station="drift"
        data-station-side="0"
        className="relative text-white"
      >
        <FadeIn as="div" className="mx-auto max-w-[1000px] px-6 py-24 sm:py-32">
          <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-mauve-magic">
            Interlude — Live product walkthrough
          </p>
          <p className="story-narration mx-auto mt-4 max-w-[520px] text-center text-lg text-mauve-2/90">
            {WALKTHROUGH_NARRATION}
          </p>
          <Plate3D className="mx-auto mt-12 max-w-[760px]" tilt={5}>
            <HeroDemo />
          </Plate3D>
        </FadeIn>
      </section>

      {/* Act III begins — a glass page floats up out of the pit */}
      <section
        data-chapter
        data-chapter-title="And the rest"
        data-station="drift"
        data-station-side="0"
        className="relative py-6 sm:py-10"
      >
        <div className="mx-auto max-w-[1248px] px-3 sm:px-6">
          <div className="story-glass relative overflow-hidden text-text">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: 'linear-gradient(180deg, rgba(231,179,255,0.22), transparent)' }}
            />
            <div className="relative mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
                <span aria-hidden="true" className="story-numeral select-none text-[clamp(6rem,16vw,13rem)] font-extrabold leading-[0.8] tracking-tight">
                  {REST_NUMERAL}
                </span>
                <div className="pb-2">
                  <p className="story-eyebrow text-xs font-bold uppercase tracking-[0.22em]">Chapter {REST_NUMERAL} — And the rest</p>
                  <p className="story-narration mt-3 max-w-[440px] text-lg text-text-muted">
                    Three more tools surface now: company search, lists and team roles.
                  </p>
                </div>
              </div>
              <ScrubHeadline
                as="h2"
                className="mt-10 max-w-[820px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
              >
                The rest of the prospecting workspace
              </ScrubHeadline>
              <Stagger as="div" className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
                {SECONDARY_FEATURES.map((f) => (
                  <StaggerItem key={f.title} as="div">
                    <TiltCard className="h-full p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-action text-white shadow-[0_8px_20px_rgba(148,0,222,0.35)]">
                        <f.icon />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-text">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">{f.desc}</p>
                    </TiltCard>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
      </section>

      {/* Numbers — every one true by construction, never a usage claim */}
      <section
        data-chapter
        data-chapter-title="Numbers"
        data-station="city"
        data-station-side="0"
        className="relative text-white"
      >
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-14 px-6 py-28 sm:grid-cols-3 sm:py-36">
          <div>
            <StatCounter value={CREDIT_COSTS.REVEAL} className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">Credits per reveal in the app</p>
          </div>
          <div>
            <StatCounter value={FREE_PLAN_MONTHLY_CREDITS} className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">Free credits every month</p>
          </div>
          <div>
            <StatCounter value={0} prefix="$" className="block text-[clamp(3.5rem,8vw,7rem)] font-extrabold leading-none tabular-nums" />
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-ink-300">To start — no card required</p>
          </div>
        </div>
      </section>

      {/* How it works — scroll-pinned on desktop, plain grid elsewhere. The
          glass pane is a sibling behind ScrollSteps, never its ancestor:
          backdrop-filter makes an element the containing block for
          position: fixed descendants, which would break the GSAP pin. The
          pane spans the whole pin range, so it stays under the pinned steps. */}
      <div
        data-chapter
        data-chapter-title="How it works"
        data-station="drift"
        data-station-side="0"
        className="relative text-text"
      >
        <div aria-hidden="true" className="story-glass pointer-events-none absolute inset-x-3 inset-y-0 mx-auto max-w-[1200px] sm:inset-x-6" />
        <div className="relative">
          <ScrollSteps eyebrow="How it works" steps={STEPS} />
        </div>
      </div>

      <GiantCTA title="Start finding work emails." />

      <MarketingFooter />
    </div>
  );
}

// Large decorative graphics for the "How it works" walkthrough — line-art
// in the brand purples so they hold on both the light and dark grounds.
function StepFindGraphic() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <defs>
        <linearGradient id="dpg-find" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9400de" />
          <stop offset="1" stopColor="#cf70ff" />
        </linearGradient>
      </defs>
      <rect x="10" y="16" width="66" height="12" rx="6" stroke="#aa00ff" strokeOpacity="0.35" strokeWidth="3" />
      <rect x="10" y="40" width="82" height="12" rx="6" stroke="#aa00ff" strokeOpacity="0.35" strokeWidth="3" />
      <rect x="10" y="64" width="54" height="12" rx="6" stroke="#aa00ff" strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="78" cy="74" r="24" stroke="url(#dpg-find)" strokeWidth="4.5" />
      <path d="M96 92l14 14" stroke="url(#dpg-find)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M68 74h20M78 64v20" stroke="#cf70ff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

function StepRevealGraphic() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <defs>
        <linearGradient id="dpg-reveal" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9400de" />
          <stop offset="1" stopColor="#cf70ff" />
        </linearGradient>
      </defs>
      <rect x="14" y="30" width="92" height="62" rx="10" stroke="url(#dpg-reveal)" strokeWidth="4.5" />
      <path d="M18 36l42 34 42-34" stroke="url(#dpg-reveal)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="30" r="16" fill="#aa00ff" fillOpacity="0.14" stroke="#cf70ff" strokeWidth="3.5" />
      <path d="M89 30l5 5 9-10" stroke="#cf70ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 14l3 6M36 8l1.5 6.5M12 24l6 3" stroke="#cf70ff" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

function StepSignalsGraphic() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <defs>
        <linearGradient id="dpg-signals" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9400de" />
          <stop offset="1" stopColor="#cf70ff" />
        </linearGradient>
      </defs>
      <rect x="16" y="72" width="16" height="34" rx="5" stroke="#aa00ff" strokeOpacity="0.4" strokeWidth="3.5" />
      <rect x="44" y="54" width="16" height="52" rx="5" stroke="#aa00ff" strokeOpacity="0.6" strokeWidth="3.5" />
      <rect x="72" y="34" width="16" height="72" rx="5" stroke="url(#dpg-signals)" strokeWidth="4" />
      <path d="M18 44c18 2 34-6 46-18" stroke="url(#dpg-signals)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M56 22l10-1-2 10" stroke="url(#dpg-signals)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="103" cy="20" r="5" fill="#cf70ff" fillOpacity="0.8" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="3" width="12" height="18" rx="1.5" />
      <path d="M9 8h2M9 12h2M9 16h2M16 11h4v10h-4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.25" />
      <circle cx="3.5" cy="12" r="1.25" />
      <circle cx="3.5" cy="18" r="1.25" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
