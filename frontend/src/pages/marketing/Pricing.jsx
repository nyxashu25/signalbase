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
import {
  PLANS,
  BILLING_INTERVALS,
  FREE_PLAN_MONTHLY_CREDITS,
  FREE_SEAT_MONTHLY_CREDITS,
  PRICING_UPDATED_AT,
  planTotalForInterval,
  teamCost,
} from '../../data/plans.js';
import { APOLLO, COMPETITOR_PRICES_CHECKED, ZOOMINFO } from '../../data/competitors.js';
import { PRICING_FAQS } from '../../data/faqs.js';
import { formatCount, pricingSummary } from '../../data/facts.js';
import { FaqSection } from '../../components/marketing/FaqSection.jsx';

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

// "August 27, 2026" — fixed to UTC so the server render and the browser agree.
function formatDay(isoDay) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const DISCOUNTS = BILLING_INTERVALS.filter((i) => i.discount > 0)
  .map((i) => `${i.label.toLowerCase()} billing ${Math.round(i.discount * 100)}%`)
  .join(' and ');

/**
 * Every plan's numbers side by side, monthly — the table readers (and answer
 * engines) scan when comparing plans, independent of the interval toggle.
 */
function PlanComparison() {
  // Numbers stay on one line; the headers wrap, so the table fits the page
  // on desktop and only scrolls sideways on narrow screens.
  const head = 'px-3 py-3 align-bottom font-bold';
  const cell = 'whitespace-nowrap px-3 py-3';
  return (
    <div className="mt-16">
      <h3 className="text-lg font-bold text-text">Plans at a glance</h3>
      <p className="mt-1 text-sm text-text-muted">
        Monthly prices per seat block. Saves {DISCOUNTS}.
      </p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-left text-sm tabular-nums">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className={head}>Plan</th>
              <th scope="col" className={head}>Price / month</th>
              <th scope="col" className={head}>Seats per block</th>
              <th scope="col" className={head}>Credits / paid seat / month</th>
              <th scope="col" className={head}>Credits / free seat / month</th>
              <th scope="col" className={head}>Owner bonus / month</th>
              <th scope="col" className={head}>Price per paid seat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {PLANS.map((plan) => {
              const b = plan.block;
              return (
                <tr key={plan.key}>
                  <th scope="row" className={`${cell} font-bold`}>{plan.name}</th>
                  <td className={cell}>{b ? `$${plan.price} per block` : '$0'}</td>
                  <td className={cell}>{b ? `${b.paidSeats} paid + ${b.freeSeats} free` : '1 seat'}</td>
                  <td className={cell}>{formatCount(b ? b.paidSeatCredits : FREE_PLAN_MONTHLY_CREDITS)}</td>
                  <td className={cell}>{b ? formatCount(FREE_SEAT_MONTHLY_CREDITS) : '—'}</td>
                  <td className={cell}>{b && b.ownerBonus ? formatCount(b.ownerBonus) : '—'}</td>
                  <td className={cell}>{b ? formatUsd(Math.round((plan.price / b.paidSeats) * 100) / 100) : '$0'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Prices last updated <time dateTime={PRICING_UPDATED_AT}>{formatDay(PRICING_UPDATED_AT)}</time>.
      </p>
      <TeamCosts />
    </div>
  );
}

const TEAM_SIZES = [5, 10, 25];
const usd = (n) => `$${formatCount(n)}`;

/**
 * What a whole team pays per month on DataPit's seat blocks next to
 * per-seat pricing — list prices only, from src/data/competitors.js.
 */
function TeamCosts() {
  const head = 'px-3 py-3 align-bottom font-bold';
  const cell = 'whitespace-nowrap px-3 py-3';
  return (
    <div className="mt-14">
      <h3 className="text-lg font-bold text-text">What does a team pay each month?</h3>
      <p className="mt-1 text-sm text-text-muted">
        DataPit charges per seat block, not per seat, so the cost grows in steps as your team does.
      </p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[680px] text-left text-sm tabular-nums">
          <thead className="bg-surface text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th scope="col" className={head}>Team size</th>
              <th scope="col" className={head}>DataPit Basic</th>
              <th scope="col" className={head}>DataPit Professional</th>
              <th scope="col" className={head}>{APOLLO.name} Basic, billed monthly</th>
              <th scope="col" className={head}>{APOLLO.name} Basic, billed annually</th>
              <th scope="col" className={head}>{ZOOMINFO.name}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text">
            {TEAM_SIZES.map((people) => {
              const basic = teamCost('BASIC', people);
              const pro = teamCost('PROFESSIONAL', people);
              return (
                <tr key={people}>
                  <th scope="row" className={`${cell} font-bold`}>{people} people</th>
                  <td className={cell}>
                    {usd(basic.monthly)} <span className="text-text-muted">({basic.blocks} {basic.blocks === 1 ? 'block' : 'blocks'})</span>
                  </td>
                  <td className={cell}>
                    {usd(pro.monthly)} <span className="text-text-muted">({pro.blocks} {pro.blocks === 1 ? 'block' : 'blocks'})</span>
                  </td>
                  <td className={cell}>{usd(APOLLO.basicMonthlyBilling * people)}</td>
                  <td className={cell}>{usd(APOLLO.basicAnnualBilling * people)} a month</td>
                  <td className={cell}>Quote only</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        List prices only; the plans don&rsquo;t include the same data or features. {APOLLO.name} Basic is ${APOLLO.basicMonthlyBilling} per
        seat per month billed monthly, or ${APOLLO.basicAnnualBilling} billed annually, per{' '}
        <a href={APOLLO.pricingUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          {APOLLO.name}&rsquo;s pricing page
        </a>
        ; {ZOOMINFO.name} publishes no prices for its paid plans (
        <a href={ZOOMINFO.pricingUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          pricing page
        </a>
        ). Checked <time dateTime={COMPETITOR_PRICES_CHECKED}>{formatDay(COMPETITOR_PRICES_CHECKED)}</time>. Compare in
        detail: <Link to="/alternatives/apollo" className="font-medium text-primary hover:underline">Apollo alternative</Link>,{' '}
        <Link to="/alternatives/zoominfo" className="font-medium text-primary hover:underline">ZoomInfo alternative</Link>.
      </p>
    </div>
  );
}

export function Pricing() {
  const [billingIntervalChoice, setBillingIntervalChoice] = useState('MONTH');
  const cadence = CADENCE_LABEL[billingIntervalChoice];

  return (
    <div className="min-h-screen">
      <StoryCover
        station="blocks"
        eyebrow="Pricing"
        narration="Pay for the platform in seat blocks. Spend credits only when the data is real."
        sub={pricingSummary()}
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

      <section
        data-chapter
        data-chapter-title="Plans"
        data-station="drift"
        data-station-side="0"
        className="relative py-6 sm:py-10"
      >
        <div className="mx-auto max-w-[1288px] px-3 sm:px-6">
          <div className="story-glass relative overflow-hidden text-text">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-64"
              style={{ background: 'linear-gradient(180deg, rgba(231,179,255,0.2), transparent)' }}
            />
            <div className="relative mx-auto max-w-[1240px] px-6 py-16 sm:py-20">
              <p className="story-eyebrow text-xs font-bold uppercase tracking-[0.22em]">Chapter 01 — The plans</p>
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
              <PlanComparison />
            </div>
          </div>
        </div>
      </section>

      <section
        data-chapter
        data-chapter-title="How billing works"
        data-station="ledger"
        data-station-side="1"
        className="relative text-white"
      >
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

      <FaqSection eyebrow="Chapter 03 — Questions" items={PRICING_FAQS} />

      <GiantCTA station="mark" title="Start free. Upgrade when it pays for itself." />

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
