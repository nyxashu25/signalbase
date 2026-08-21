import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MarketingNav } from '../../components/marketing/MarketingNav.jsx';
import { MarketingFooter } from '../../components/marketing/MarketingFooter.jsx';
import { AnimatedCreditLedgerMockup } from '../../components/marketing/AnimatedCreditLedgerMockup.jsx';
import { FadeIn, Stagger, StaggerItem } from '../../components/marketing/motion.jsx';
import { PLANS, BILLING_INTERVALS, planPriceForInterval } from '../../data/plans.js';

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
    <div className="min-h-screen bg-bg">
      <MarketingNav />

      <section className="mx-auto max-w-[1120px] px-6 pb-6 pt-20 text-center">
        <Stagger as="div" whileInView={false} staggerDelay={0.1}>
          <StaggerItem as="h1" className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            Simple, seat-based pricing
          </StaggerItem>
          <StaggerItem as="p" className="mx-auto mt-4 max-w-[560px] text-base text-text-muted">
            Every plan runs on the same credit ledger. Pay for seats, spend credits only on the
            contacts you actually reveal.
          </StaggerItem>

          <StaggerItem as="div" className="mt-8 inline-flex rounded-md border border-border p-0.5">
            {BILLING_INTERVALS.map((i) => (
              <button
                key={i.key}
                type="button"
                onClick={() => setBillingIntervalChoice(i.key)}
                className={`rounded px-4 py-1.5 text-sm font-bold ${
                  billingIntervalChoice === i.key ? 'bg-gradient-action text-white' : 'text-text-muted'
                }`}
              >
                {i.label}
                {i.discount > 0 && (
                  <span className="ml-1.5 text-[11px] font-medium opacity-80">
                    −{Math.round(i.discount * 100)}%
                  </span>
                )}
              </button>
            ))}
          </StaggerItem>
        </Stagger>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-14">
        <Stagger as="div" className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4" staggerDelay={0.1}>
          {PLANS.map((plan) => {
            const displayPrice =
              plan.key === 'FREE' ? 0 : planPriceForInterval(plan.key, billingIntervalChoice);
            const unit =
              plan.key === 'ORGANIZATION'
                ? `seat/${cadence}, min 3 seats`
                : plan.unit && `seat/${cadence}`;

            return (
              <StaggerItem
                key={plan.key}
                as="div"
                className={`flex flex-col rounded-xl border p-7 ${
                  plan.popular
                    ? 'border-primary/40 bg-surface-elevated shadow-dp-md ring-2 ring-primary'
                    : 'border-border bg-surface-elevated shadow-dp'
                }`}
              >
                {plan.popular && (
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-text">{plan.name}</h3>
                <p className="mt-1 text-sm text-text-muted">{plan.tagline}</p>

                <div className="relative mt-6 flex items-baseline gap-1">
                  <AnimatedPrice
                    value={formatUsd(displayPrice)}
                    className="text-4xl font-extrabold tracking-tight text-text"
                  />
                  {unit && <span className="text-sm text-text-muted">/{unit}</span>}
                </div>
                {!plan.unit && <div className="mt-1 text-sm text-text-muted">forever</div>}

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
              </StaggerItem>
            );
          })}
        </Stagger>
        <p className="mt-8 text-center text-xs text-text-muted">
          Prices shown are per seat. Quarterly and annual billing come with a 10% and 20% discount —
          pick your cadence above or at checkout.
        </p>
      </section>

      <section className="border-t border-border bg-ink-950">
        <Stagger
          as="div"
          className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-14 px-6 py-24 lg:grid-cols-2"
          staggerDelay={0.15}
        >
          <StaggerItem as="div">
            <span className="text-xs font-bold uppercase tracking-wide text-mauve-magic">
              How billing actually works
            </span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              You only spend a credit when a reveal succeeds
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-300">
              Your seat price covers the platform. Credits are the only thing that moves when you
              actually use it &mdash; every grant, reveal, and top-up lands in the same append-only
              ledger you can see in your workspace at any time.
            </p>
          </StaggerItem>
          <StaggerItem as="div">
            <AnimatedCreditLedgerMockup />
          </StaggerItem>
        </Stagger>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[760px] px-6 py-24">
          <FadeIn as="h2" className="text-center text-3xl font-extrabold tracking-tight text-text">
            Frequently asked questions
          </FadeIn>
          <Stagger as="div" className="mt-10 flex flex-col gap-6" staggerDelay={0.08}>
            {FAQS.map((item) => (
              <StaggerItem
                key={item.q}
                as="div"
                className="rounded-lg border border-border bg-surface-elevated p-6"
              >
                <h3 className="text-sm font-bold text-text">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.a}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
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
