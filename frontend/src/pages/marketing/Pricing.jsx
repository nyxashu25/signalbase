import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { StoryCover } from '../../components/marketing/StoryCover.jsx';
import { Plate3D } from '../../components/marketing/Plate3D.jsx';
import { TiltCard } from '../../components/marketing/TiltCard.jsx';
import { ScrubHeadline } from '../../components/marketing/ScrubHeadline.jsx';
import { GiantCTA } from '../../components/marketing/GiantCTA.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';
import { PLANS, BILLING_INTERVALS, planTotalForInterval } from '../../data/plans.js';

const CADENCE_LABEL = { MONTH: 'month', QUARTER: 'quarter', YEAR: 'year' };

// Whole monthly prices stay clean ($29); quarterly/annual discounts can
// land on a fractional dollar (29 * 3 * 0.9 = $78.30) — mirrors the same
// helper in pages/Billing.jsx so the two pages never format a price
// differently for the same plan/interval.
function formatUsd(amount) {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

// Crossfades to the new digits when the billing interval toggle changes the
// price, rather than the number just snapping — small enough to skip
// entirely under prefers-reduced-motion.
function AnimatedPrice({ value, className }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <span className={className}>{value}</span>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className={className}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

const FAQS = [
  {
    q: 'What is a credit?',
    a: "Revealing a contact's verified email costs 2 credits. Search and masked results never cost a credit — only the reveal action does, and it's reserved atomically so concurrent requests can never over-spend your balance.",
  },
  {
    q: 'Do unused credits roll over?',
    a: 'Monthly credits reset each billing cycle and do not roll over. Once any teammate in your workspace reveals a contact, the whole workspace can see it for free going forward.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes — upgrade, downgrade, or cancel from your workspace billing page at any time. Changes take effect at your next billing cycle.',
  },
  {
    q: 'Is there a free trial on paid plans?',
    a: 'The Free plan itself is a real, permanently free workspace — search and reveal against live data, no card required, no trial clock.',
  },
];

export function Pricing() {
  const [billingIntervalChoice, setBillingIntervalChoice] = useState('MONTH');
  const cadence = CADENCE_LABEL[billingIntervalChoice];

  return (
    <div className="min-h-screen">
      <StoryCover
        eyebrow="Pricing"
        narration="Pay for the platform in seat blocks. Spend credits only when the data is real."
        sub="Paid plans come in seat blocks — each block bundles paid seats plus bonus free seats, and every teammate earns their own monthly credits. Buy as many blocks as your team needs."
        lines={[
          { content: 'Simple, team-based' },
          {
            content: <span className="bg-gradient-brand bg-clip-text text-transparent">pricing.</span>,
            className: 'sm:ml-[6vw]',
          },
        ]}
      >
        <div className="inline-flex rounded-md border border-white/15 bg-white/5 p-0.5 backdrop-blur">
          {BILLING_INTERVALS.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => setBillingIntervalChoice(i.key)}
              className={`rounded px-4 py-1.5 text-sm font-bold transition-colors ${
                billingIntervalChoice === i.key ? 'bg-gradient-action text-white' : 'text-ink-300 hover:text-white'
              }`}
            >
              {i.label}
              {i.discount > 0 && (
                <span className="ml-1.5 text-[11px] font-medium opacity-80">−{Math.round(i.discount * 100)}%</span>
              )}
            </button>
          ))}
        </div>
      </StoryCover>

      <section data-chapter data-chapter-title="Plans" className="story-surface relative text-text">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{ background: 'linear-gradient(180deg, rgba(231,179,255,0.2), transparent)' }}
        />
        <div className="relative mx-auto max-w-[1240px] px-6 py-20 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Chapter 01 — The plans</p>
          <Stagger as="div" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4" staggerDelay={0.1}>
            {PLANS.map((plan) => {
              const displayPrice = plan.key === 'FREE' ? 0 : planTotalForInterval(plan.key, billingIntervalChoice);
              const unit =
                plan.block && `block/${cadence} · ${plan.block.paidSeats} paid + ${plan.block.freeSeats} free seats`;

              return (
                <StaggerItem key={plan.key} as="div">
                  <TiltCard featured={plan.popular} className="flex h-full flex-col p-7">
                    <div className="flex h-full flex-col">
                      {plan.popular && (
                        <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                          Most popular
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-text">{plan.name}</h3>
                      <p className="mt-1 text-sm text-text-muted">{plan.tagline}</p>

                      <div className="relative mt-6 flex items-baseline gap-1">
                        <AnimatedPrice value={formatUsd(displayPrice)} className="text-4xl font-extrabold tracking-tight text-text" />
                        {unit && <span className="text-sm text-text-muted">/{unit}</span>}
                      </div>
                      {!plan.block && <div className="mt-1 text-sm text-text-muted">forever</div>}

                      <div className="mt-3 inline-flex w-fit rounded-full bg-surface px-3 py-1 text-xs font-bold text-text-muted">
                        {plan.credits}
                      </div>

                      <Link
                        to={plan.key === 'ORGANIZATION' ? '/contact' : '/login?mode=register'}
                        className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-bold transition-transform duration-150 ease-brand hover:-translate-y-px ${
                          plan.popular
                            ? 'bg-gradient-action text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)]'
                            : 'border border-border bg-surface-elevated text-text'
                        }`}
                      >
                        {plan.key === 'ORGANIZATION' ? 'Talk to sales' : 'Start free'}
                      </Link>

                      <ul className="mt-7 flex flex-1 flex-col gap-3 text-sm text-text-muted">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <CheckIcon />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
          <p className="mt-8 text-center text-xs text-text-muted">
            Prices are per seat block — buy as many blocks as your team needs, with no seat limit. Free
            seats never cost anything and still earn 1,500 credits a month. Every newly covered teammate
            gets a one-time 1,500-credit welcome gift. Quarterly and annual billing come with a 10% and
            20% discount.
          </p>
        </div>
      </section>

      <section data-chapter data-chapter-title="How billing works" className="relative text-white">
        <div className="mx-auto max-w-[1200px] px-6 py-28 sm:py-36">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-mauve-magic">Chapter 02 — How billing actually works</p>
          <ScrubHeadline
            as="h2"
            className="mt-6 max-w-[820px] text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight"
          >
            You only spend a credit when a reveal succeeds
          </ScrubHeadline>
          <div className="mt-14 grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
            <FadeIn as="p" className="text-base leading-relaxed text-ink-300">
              Your plan price covers the platform and your whole team. Credits are the only thing that
              moves when you actually use it &mdash; every grant, reveal, and top-up lands in the same
              append-only ledger you can see in your workspace at any time.
            </FadeIn>
            <FadeIn as="div" delay={0.15}>
              <Plate3D>
                <AnimatedCreditLedgerMockup />
              </Plate3D>
            </FadeIn>
          </div>
        </div>
      </section>

      <section data-chapter data-chapter-title="FAQ" className="story-surface relative text-text">
        <div className="mx-auto max-w-[900px] px-6 py-24 sm:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Chapter 03 — Questions</p>
          <ScrubHeadline
            as="h2"
            className="mt-6 text-[clamp(1.9rem,4.6vw,4rem)] font-extrabold uppercase leading-[1.05] tracking-tight text-text"
          >
            Frequently asked questions
          </ScrubHeadline>
          <Stagger as="div" className="mt-12 flex flex-col gap-5" staggerDelay={0.08}>
            {FAQS.map((item) => (
              <StaggerItem key={item.q} as="div">
                <TiltCard tilt={3} className="p-6">
                  <h3 className="text-sm font-bold text-text">{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.a}</p>
                </TiltCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <GiantCTA title="Start free. Upgrade when it pays for itself." />

      <MarketingFooter />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-primary">
      <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
