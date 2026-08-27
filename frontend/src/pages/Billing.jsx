import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Check } from 'lucide-react';
import {
  useGetBillingSummaryQuery,
  useListBillingTransactionsQuery,
  useSubscribeToPlanMutation,
} from '../api/billingApi.js';
import { Pagination } from '../components/Pagination.jsx';
import { PLANS, findPlan, BILLING_INTERVALS, planTotalForInterval } from '../data/plans.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Card, TableFrame, thClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { InfoHint } from '../components/ui/Tooltip.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';

const PAGE_SIZE = 25;

const REASON_LABELS = {
  MONTHLY_GRANT: 'Monthly grant',
  EMAIL_REVEAL: 'Reveal',
  EXTENSION_REVEAL: 'Extension reveal',
  COMPANY_VIEW: 'Company view',
  CSV_EXPORT: 'CSV export',
  SEQUENCE_ENROLLMENT: 'Sequence enrollment',
  TOPUP: 'Payment',
  ADJUSTMENT: 'Adjustment',
  ONBOARDING_REWARD: 'Onboarding reward',
};

const REASON_TONE = {
  MONTHLY_GRANT: 'accent',
  TOPUP: 'success',
  ADJUSTMENT: 'warning',
  ONBOARDING_REWARD: 'success',
};

const PLAN_ORDER = ['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION'];
const CADENCE = { MONTH: 'month', QUARTER: 'quarter', YEAR: 'year' };

function nextMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function formatCents(cents) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

// Whole monthly prices stay clean ($29); quarterly/annual discounts can
// land on a fractional dollar (29 * 3 * 0.9 = $78.30) and shouldn't be
// truncated to a single stray decimal digit.
function formatUsd(amount) {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

// Adds calendar months (not a flat day count) — matches the backend's
// addMonths in stripeService.js, so the displayed lock date agrees with
// what the server actually enforces.
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function Billing() {
  const [page, setPage] = useState(1);
  const [billingIntervalChoice, setBillingIntervalChoice] = useState('MONTH');
  const { data: summary } = useGetBillingSummaryQuery();
  const { data: transactions, isFetching } = useListBillingTransactionsQuery({
    page,
    pageSize: PAGE_SIZE,
  });
  const [subscribeToPlan, { isLoading: subscribing }] = useSubscribeToPlanMutation();
  const [subscribingKey, setSubscribingKey] = useState(null);
  const [subscribeError, setSubscribeError] = useState(null);

  const currentPlan = summary ? findPlan(summary.plan) : null;
  const currentInterval = BILLING_INTERVALS.find((i) => i.key === summary?.billingInterval);

  // Pay-as-you-go: a paid plan can't be downgraded until the billing
  // interval it was taken at has run its course (see
  // stripeService.createPlanSubscriptionSession) — mirrored here so the UI
  // reflects the lock before the user ever clicks Downgrade, rather than
  // only surfacing it as a rejected-request error.
  const lockedUntil =
    summary?.planActivatedAt &&
    addMonths(new Date(summary.planActivatedAt), currentInterval?.months ?? 1);
  const isLocked = Boolean(lockedUntil && lockedUntil > new Date());

  async function handleSubscribe(planKey) {
    setSubscribeError(null);
    setSubscribingKey(planKey);
    try {
      const session = await subscribeToPlan({
        plan: planKey,
        interval: billingIntervalChoice,
        // Seats are fixed by the plan server-side — nothing to send.
      }).unwrap();
      window.location.href = session.url;
    } catch (err) {
      setSubscribeError(err.data?.error?.message || 'Could not start checkout. Please try again.');
      setSubscribingKey(null);
    }
  }

  const usedPct =
    summary && summary.monthlyCreditGrant > 0
      ? Math.min(100, Math.round((summary.creditsUsed / summary.monthlyCreditGrant) * 100))
      : 0;

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Your plan, credit balance, and every credit movement on one ledger."
        actions={
          <Button variant="hero" icon={Coins} to="/app/billing/add-credits">
            Add credits
          </Button>
        }
      />

      {/* Plan overview */}
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
          <Metric label="Current plan" hint="Change plans below — upgrades apply immediately. Each plan bundles a fixed number of seats; credits scale with them.">
            <span className="text-2xl font-extrabold text-text">{currentPlan?.name ?? '—'}</span>
            {summary?.seats > 0 && (
              <span className="ml-2 text-xs font-medium text-text-muted">
                {summary.seats} {summary.seats === 1 ? 'seat' : 'seats'}
              </span>
            )}
            {currentPlan && currentPlan.price > 0 && currentInterval && (
              <span className="ml-2 text-xs font-medium text-text-muted">
                {formatUsd(planTotalForInterval(currentPlan.key, currentInterval.key))}/
                {CADENCE[currentInterval.key]}
              </span>
            )}
          </Metric>
          <Metric label="Balance" hint="Credits available right now, including any top-ups.">
            <span className="text-2xl font-extrabold tabular-nums text-text">
              {summary?.balance ?? '—'}
            </span>
          </Metric>
          <Metric label="Monthly grant" hint="Credits added at the start of every billing cycle on your plan.">
            <span className="text-2xl font-extrabold tabular-nums text-text">
              {summary?.monthlyCreditGrant ?? '—'}
            </span>
          </Metric>
          <Metric label="Used this cycle" hint="Credits spent since your last grant.">
            <span className="text-2xl font-extrabold tabular-nums text-text">
              {summary?.creditsUsed ?? '—'}
            </span>
          </Metric>
          <Metric
            label={isLocked ? 'Committed until' : 'Renews'}
            hint={
              isLocked
                ? 'Your billing interval is the minimum commitment — downgrades open up after this date.'
                : 'Monthly credits are granted on the 1st of every month.'
            }
          >
            <span className="text-base font-bold text-text">
              {isLocked && lockedUntil
                ? lockedUntil.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                : nextMonthStart().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </span>
          </Metric>
        </div>
        {summary && summary.monthlyCreditGrant > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Monthly usage</span>
              <span className="tabular-nums">{usedPct}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${usedPct}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Plans */}
      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text">
          {summary?.plan === 'ORGANIZATION' ? 'Your plan' : 'Plans'}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            ariaLabel="Billing interval"
            value={billingIntervalChoice}
            onChange={setBillingIntervalChoice}
            options={BILLING_INTERVALS.map((i) => ({
              value: i.key,
              label: i.label,
              hint: i.discount > 0 ? `−${Math.round(i.discount * 100)}%` : undefined,
            }))}
          />
        </div>
      </div>
      {subscribeError && (
        <Banner tone="danger" className="mb-3">
          {subscribeError}
        </Banner>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = summary?.plan === plan.key;
          const isDowngrade =
            summary && PLAN_ORDER.indexOf(plan.key) < PLAN_ORDER.indexOf(summary.plan);
          const displayPrice =
            plan.key === 'FREE' ? 0 : planTotalForInterval(plan.key, billingIntervalChoice);
          const cadence = CADENCE[billingIntervalChoice];
          const cadenceUnit = `${cadence} · ${plan.seats} seats`;

          return (
            <Card
              key={plan.key}
              className={`flex flex-col p-5 ${
                isCurrent ? 'border-primary ring-1 ring-primary' : plan.popular ? 'border-primary/40' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-text">{plan.name}</p>
                {isCurrent && <StatusPill tone="accent">Current</StatusPill>}
                {!isCurrent && plan.popular && <StatusPill tone="accent">Popular</StatusPill>}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-text">
                {formatUsd(displayPrice)}
                {plan.key !== 'FREE' && (
                  <span className="text-xs font-medium text-text-muted">/{cadenceUnit}</span>
                )}
              </p>
              <p className="mt-1 text-xs text-text-muted">{plan.credits}</p>

              <div className="mt-4">
                {plan.key === 'FREE' ? (
                  <div className="rounded-md border border-border px-3 py-2 text-center text-xs font-semibold text-text-muted">
                    No purchase needed
                  </div>
                ) : plan.key === 'ORGANIZATION' && !isCurrent ? (
                  <Button variant="secondary" size="sm" to="/contact" className="w-full">
                    Talk to sales
                  </Button>
                ) : (
                  <Button
                    variant={isCurrent ? 'secondary' : isDowngrade ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full"
                    disabled={isCurrent || (isDowngrade && isLocked)}
                    loading={subscribingKey === plan.key && subscribing}
                    onClick={() => handleSubscribe(plan.key)}
                    title={
                      isDowngrade && isLocked
                        ? `Your ${currentPlan?.name} plan is locked in until ${lockedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} under the 3-month minimum commitment.`
                        : undefined
                    }
                  >
                    {isCurrent
                      ? 'Current plan'
                      : subscribingKey === plan.key && subscribing
                        ? 'Starting checkout…'
                        : isDowngrade && isLocked
                          ? `Locked until ${lockedUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : isDowngrade
                            ? 'Downgrade'
                            : 'Upgrade'}
                  </Button>
                )}
              </div>

              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-xs text-text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Ledger */}
      <h2 className="mb-3 mt-8 text-sm font-bold text-text">Transaction history</h2>
      <TableFrame>
        <table className="w-full">
          <thead>
            <tr>
              <th className={thClass}>Type</th>
              <th className={thClass}>Credits</th>
              <th className={thClass}>Amount</th>
              <th className={thClass}>Contact</th>
              <th className={thClass}>Date</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && !transactions && <SkeletonRows rows={5} columns={5} />}
            {transactions?.results.map((t) => (
              <tr key={t.id} className={trClass}>
                <td className="px-4 py-3">
                  <StatusPill tone={REASON_TONE[t.reason] ?? 'neutral'}>
                    {REASON_LABELS[t.reason]}
                  </StatusPill>
                </td>
                <td className={`${tdMutedClass} tabular-nums`}>
                  {t.delta > 0 ? '+' : ''}
                  {t.delta}
                </td>
                <td className={`${tdMutedClass} tabular-nums`}>{formatCents(t.amountCents)}</td>
                <td className={tdMutedClass}>
                  {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : '—'}
                </td>
                <td className={tdMutedClass}>{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {transactions && transactions.results.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState compact illustration={<Illustration.Billing />} title="No transactions yet">
                    Reveals, exports, grants, and purchases all show up here as they happen.{' '}
                    <Link to="/app/people" className="font-semibold text-primary hover:underline">
                      Find your first contact
                    </Link>
                    .
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {transactions && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={transactions.total}
            onPageChange={setPage}
          />
        )}
      </TableFrame>
    </div>
  );
}

function Metric({ label, hint, children }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
        {label}
        {hint && <InfoHint content={hint} />}
      </p>
      <p className="mt-1.5">{children}</p>
    </div>
  );
}
