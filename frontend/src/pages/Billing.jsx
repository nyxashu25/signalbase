import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetBillingSummaryQuery,
  useListBillingTransactionsQuery,
  useSubscribeToPlanMutation,
} from '../api/billingApi.js';
import { Pagination } from '../components/Pagination.jsx';
import { PLANS, findPlan } from '../data/plans.js';

const PAGE_SIZE = 25;

const REASON_LABELS = {
  MONTHLY_GRANT: 'Monthly grant',
  EMAIL_REVEAL: 'Reveal',
  COMPANY_VIEW: 'Company view',
  CSV_EXPORT: 'CSV export',
  SEQUENCE_ENROLLMENT: 'Sequence enrollment',
  TOPUP: 'Payment',
  ADJUSTMENT: 'Adjustment',
};

const REASON_STYLES = {
  MONTHLY_GRANT: 'bg-primary/15 text-primary',
  EMAIL_REVEAL: 'bg-surface text-text-muted',
  COMPANY_VIEW: 'bg-surface text-text-muted',
  CSV_EXPORT: 'bg-surface text-text-muted',
  SEQUENCE_ENROLLMENT: 'bg-surface text-text-muted',
  TOPUP: 'bg-emerald-500/15 text-emerald-600',
  ADJUSTMENT: 'bg-amber-500/15 text-amber-600',
};

const PLAN_ORDER = ['FREE', 'BASIC', 'PROFESSIONAL', 'ORGANIZATION'];

function formatCents(cents) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export function Billing() {
  const [page, setPage] = useState(1);
  const { data: summary } = useGetBillingSummaryQuery();
  const { data: transactions, isFetching } = useListBillingTransactionsQuery({
    page,
    pageSize: PAGE_SIZE,
  });
  const [subscribeToPlan, { isLoading: subscribing }] = useSubscribeToPlanMutation();
  const [subscribingKey, setSubscribingKey] = useState(null);
  const [subscribeError, setSubscribeError] = useState(null);

  const currentPlan = summary ? findPlan(summary.plan) : null;

  async function handleSubscribe(planKey) {
    setSubscribeError(null);
    setSubscribingKey(planKey);
    try {
      const session = await subscribeToPlan({ plan: planKey }).unwrap();
      window.location.href = session.url;
    } catch (err) {
      setSubscribeError(err.data?.error?.message || 'Could not start checkout. Please try again.');
      setSubscribingKey(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Billing</h1>
        <Link
          to="/app/billing/add-credits"
          className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)]"
        >
          Add credits
        </Link>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface-elevated p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
              Current plan
            </p>
            <p className="mt-1 text-2xl font-extrabold text-text">
              {currentPlan?.name ?? '—'}
              {currentPlan?.price > 0 && (
                <span className="ml-2 text-sm font-medium text-text-muted">
                  ${currentPlan.price}/{currentPlan.unit}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Balance</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-text">
                {summary?.balance ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Monthly grant
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-text">
                {summary?.monthlyCreditGrant ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                Used this cycle
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-text">
                {summary?.creditsUsed ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-text-muted">
        {summary?.plan === 'ORGANIZATION' ? 'Your plan' : 'Upgrade your plan'}
      </h2>
      {subscribeError && <p className="mt-2 text-sm text-red-600">{subscribeError}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = summary?.plan === plan.key;
          const isDowngrade =
            summary && PLAN_ORDER.indexOf(plan.key) < PLAN_ORDER.indexOf(summary.plan);

          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-lg border p-5 ${
                isCurrent
                  ? 'border-primary/40 ring-2 ring-primary'
                  : plan.popular
                    ? 'border-primary/30'
                    : 'border-border'
              } bg-surface-elevated`}
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-text">{plan.name}</p>
                {isCurrent && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Current
                  </span>
                )}
                {!isCurrent && plan.popular && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-extrabold text-text">
                ${plan.price}
                {plan.unit && (
                  <span className="text-xs font-medium text-text-muted">/{plan.unit}</span>
                )}
              </p>
              <p className="mt-1 text-xs text-text-muted">{plan.credits}</p>

              {plan.key === 'FREE' ? (
                <div className="mt-4 rounded-md border border-border px-3 py-2 text-center text-xs font-bold text-text-muted">
                  No purchase needed
                </div>
              ) : plan.key === 'ORGANIZATION' && !isCurrent ? (
                <Link
                  to="/contact"
                  className="mt-4 rounded-md border border-border px-3 py-2 text-center text-xs font-bold text-text hover:border-primary/40"
                >
                  Talk to sales
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={isCurrent || subscribing}
                  onClick={() => handleSubscribe(plan.key)}
                  className={`mt-4 rounded-md px-3 py-2 text-xs font-bold transition-transform duration-150 ease-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCurrent
                      ? 'border border-border text-text-muted'
                      : 'bg-gradient-action text-white hover:-translate-y-px'
                  }`}
                >
                  {isCurrent
                    ? 'Current plan'
                    : subscribingKey === plan.key && subscribing
                      ? 'Starting checkout…'
                      : isDowngrade
                        ? 'Downgrade'
                        : 'Upgrade'}
                </button>
              )}

              <ul className="mt-4 flex flex-1 flex-col gap-2 text-xs text-text-muted">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-text-muted">
        Transaction history
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.results.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-surface">
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${REASON_STYLES[t.reason]}`}
                  >
                    {REASON_LABELS[t.reason]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                  {t.delta > 0 ? '+' : ''}
                  {t.delta}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                  {formatCents(t.amountCents)}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {transactions && transactions.results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-muted">
                  {isFetching ? 'Loading…' : 'No transactions yet'}
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
      </div>
    </div>
  );
}
