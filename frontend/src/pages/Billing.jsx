import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetBillingSummaryQuery, useListBillingTransactionsQuery } from '../api/billingApi.js';
import { Pagination } from '../components/Pagination.jsx';

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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface-elevated p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Balance</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">
            {summary?.balance ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Monthly grant</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">
            {summary?.monthlyCreditGrant ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-elevated p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Used this cycle
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">
            {summary?.creditsUsed ?? '—'}
          </p>
        </div>
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
          <Pagination page={page} pageSize={PAGE_SIZE} total={transactions.total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
