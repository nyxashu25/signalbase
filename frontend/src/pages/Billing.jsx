import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Check } from 'lucide-react';
import {
  useGetBillingSummaryQuery,
  useListBillingTransactionsQuery,
  useSubscribeToPlanMutation,
} from '../api/billingApi.js';
import { Pagination } from '../components/Pagination.jsx';
import {
  PLANS,
  findPlan,
  BILLING_INTERVALS,
  blockPriceForInterval,
  planTotalForInterval,
} from '../data/plans.js';
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
  // null = "not touched yet" — falls back to the server's suggestedBlocks
  // (enough blocks to cover every current member) until the owner dials it.
  const [blockChoice, setBlockChoice] = useState(null);
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

  const blocks = blockChoice ?? summary?.suggestedBlocks ?? 1;
  const pendingCount = summary?.assigned?.pending ?? 0;

  async function handleSubscribe(planKey) {
    setSubscribeError(null);
    setSubscribingKey(planKey);
    try {
      const session = await subscribeToPlan({
        plan: planKey,
        interval: billingIntervalChoice,
        blocks,
      }).unwrap();
      window.location.href = session.url;
    } catch (err) {
      setSubscribeError(err.data?.error?.message || 'Could not start checkout. Please try again.');
      setSubscribingKey(null);
    }
  }

  // Personal usage: what you've spent vs everything you've ever had
  // (current balance + spent) — a per-user view now that credits are
  // personal.
  const totalEver = (summary?.balance ?? 0) + (summary?.creditsUsed ?? 0);
  const usedPct =
    summary && totalEver > 0 ? Math.min(100, Math.round((summary.creditsUsed / totalEver) * 100)) : 0;

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
          <Metric label="Current plan" hint="Change plans below — upgrades apply immediately. Paid plans come in seat blocks (paid + free seats); every teammate earns their own monthly credits.">
            <span className="text-2xl font-extrabold text-text">{currentPlan?.name ?? '—'}</span>
            {summary?.blocks > 0 && (
              <span className="ml-2 text-xs font-medium text-text-muted">
                {summary.blocks} {summary.blocks === 1 ? 'block' : 'blocks'}
              </span>
            )}
            {currentPlan && currentPlan.price > 0 && currentInterval && summary?.blocks > 0 && (
              <span className="ml-2 text-xs font-medium text-text-muted">
                {formatUsd(
                  planTotalForInterval(currentPlan.key, currentInterval.key, summary.blocks),
                )}
                /{CADENCE[currentInterval.key]}
              </span>
            )}
          </Metric>
          <Metric label="Your balance" hint="Your personal credits, available right now — every teammate has their own balance.">
            <span className="text-2xl font-extrabold tabular-nums text-text">
              {summary?.balance ?? '—'}
            </span>
          </Metric>
          <Metric
            label="Seat coverage"
            hint="Paid + free seats in use vs what your blocks provide. Pending members can log in but can't spend until a block covers them."
          >
            {summary?.capacity ? (
              <span className="text-base font-bold tabular-nums text-text">
                {summary.assigned.paid}/{summary.capacity.paid} paid ·{' '}
                {summary.assigned.free}/{summary.capacity.free} free
              </span>
            ) : (
              <span className="text-base font-bold text-text">—</span>
            )}
            {pendingCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-amber-500">
                {pendingCount} pending
              </span>
            )}
          </Metric>
          <Metric label="Used this cycle" hint="Credits you personally spent since your last grant.">
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
        {summary && totalEver > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>Your credit usage</span>
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
          <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            Blocks
            <input
              type="number"
              min={1}
              max={200}
              value={blocks}
              onChange={(e) =>
                setBlockChoice(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
              }
              aria-label="Seat blocks"
              className="h-8 w-16 rounded-md border border-border bg-surface-elevated px-2 text-sm tabular-nums text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
            />
          </label>
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
      {pendingCount > 0 && (
        <Banner tone="info" className="mb-3" title={`${pendingCount} teammate${pendingCount === 1 ? '' : 's'} awaiting payment`}>
          Buying {summary?.suggestedBlocks ?? 1}{' '}
          {(summary?.suggestedBlocks ?? 1) === 1 ? 'block' : 'blocks'} covers everyone currently in
          your workspace — each newly covered teammate gets a one-time 1,500-credit welcome gift.
        </Banner>
      )}
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
            plan.key === 'FREE' ? 0 : planTotalForInterval(plan.key, billingIntervalChoice, blocks);
          const cadence = CADENCE[billingIntervalChoice];
          const seatCapacityLabel = plan.block
            ? `${blocks * plan.block.paidSeats} paid + ${blocks * plan.block.freeSeats} free seats`
            : null;
          const cadenceUnit = plan.block
            ? `${cadence} · ${blocks} ${blocks === 1 ? 'block' : 'blocks'}`
            : cadence;

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
              {seatCapacityLabel && (
                <p className="mt-1 text-xs font-semibold text-text">
                  {seatCapacityLabel}
                  <span className="ml-1 font-normal text-text-muted">
                    ({formatUsd(blockPriceForInterval(plan.key, billingIntervalChoice))}/block)
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-text-muted">{plan.credits}</p>

              <div className="mt-4">
                {plan.key === 'FREE' ? (
                  <div className="rounded-md border border-border px-3 py-2 text-center text-xs font-semibold text-text-muted">
                    No purchase needed
                  </div>
                ) : (
                  <Button
                    variant={isCurrent ? 'secondary' : isDowngrade ? 'secondary' : 'primary'}
                    size="sm"
                    className="w-full"
                    disabled={
                      (isCurrent && blocks === summary?.blocks) || (isDowngrade && isLocked)
                    }
                    loading={subscribingKey === plan.key && subscribing}
                    onClick={() => handleSubscribe(plan.key)}
                    title={
                      isDowngrade && isLocked
                        ? `Your ${currentPlan?.name} plan is locked in until ${lockedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} under the 3-month minimum commitment.`
                        : undefined
                    }
                  >
                    {isCurrent && blocks === summary?.blocks
                      ? 'Current plan'
                      : subscribingKey === plan.key && subscribing
                        ? 'Starting checkout…'
                        : isDowngrade && isLocked
                          ? `Locked until ${lockedUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : isCurrent
                            ? `Change to ${blocks} ${blocks === 1 ? 'block' : 'blocks'}`
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
