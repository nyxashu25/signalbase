import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useGetBillingSummaryQuery, useListBillingTransactionsQuery } from '../api/billingApi.js';
import { useListSequencesQuery } from '../api/sequencesApi.js';
import { useListListsQuery } from '../api/listsApi.js';

const REASON_LABELS = {
  MONTHLY_GRANT: 'Monthly grant',
  EMAIL_REVEAL: 'Reveal',
  COMPANY_VIEW: 'Company view',
  CSV_EXPORT: 'CSV export',
  SEQUENCE_ENROLLMENT: 'Sequence enrollment',
  TOPUP: 'Payment',
  ADJUSTMENT: 'Adjustment',
};

const QUICK_ACTIONS = [
  { to: '/app/people', label: 'Search people' },
  { to: '/app/companies', label: 'Search companies' },
  { to: '/app/sequences/new', label: 'New sequence' },
  { to: '/app/billing/add-credits', label: 'Add credits' },
];

export function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const { data: summary } = useGetBillingSummaryQuery();
  const { data: recent } = useListBillingTransactionsQuery({ page: 1, pageSize: 5 });
  const { data: sequences } = useListSequencesQuery();
  const { data: lists } = useListListsQuery();

  const activeSequences = sequences?.filter((s) => s.status === 'ACTIVE').length ?? 0;

  return (
    <div>
      <h1 className="text-xl font-semibold text-text">
        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          to="/app/billing"
          className="rounded-lg border border-border bg-surface-elevated p-5 transition-colors duration-150 ease-brand hover:border-primary/40"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Credits</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">
            {summary?.balance ?? '—'}
          </p>
        </Link>
        <Link
          to="/app/sequences"
          className="rounded-lg border border-border bg-surface-elevated p-5 transition-colors duration-150 ease-brand hover:border-primary/40"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
            Active sequences
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">{activeSequences}</p>
        </Link>
        <Link
          to="/app/lists"
          className="rounded-lg border border-border bg-surface-elevated p-5 transition-colors duration-150 ease-brand hover:border-primary/40"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Saved lists</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-text">
            {lists?.length ?? '—'}
          </p>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text-muted hover:border-primary/40 hover:text-primary"
          >
            {action.label}
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-text-muted">
        Recent activity
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <tbody>
            {recent?.results.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="px-4 py-3 text-sm text-text">{REASON_LABELS[t.reason]}</td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                  {t.delta > 0 ? '+' : ''}
                  {t.delta} credits
                </td>
                <td className="px-4 py-3 text-right text-sm text-text-muted">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {recent && recent.results.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  No activity yet — search for people or companies to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
