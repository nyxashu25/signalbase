import {
  useGetAdminBillingOverviewQuery,
  useListAdminTransactionsQuery,
} from '../../api/adminDataApi.js';

function formatCents(cents) {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export function AdminBilling() {
  const { data: overview } = useGetAdminBillingOverviewQuery();
  const { data: transactions, isFetching } = useListAdminTransactionsQuery({
    page: 1,
    pageSize: 50,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Billing</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-ink-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">Total revenue</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">
            {formatCents(overview?.totalRevenueCents)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-ink-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">
            Paid transactions
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">
            {overview?.transactionCount ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-ink-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-300">Payment gateway</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                overview?.paymentGateway?.connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm font-bold text-white">
              Stripe {overview?.paymentGateway?.connected ? 'connected' : 'not connected'}
            </span>
          </div>
          {!overview?.paymentGateway?.connected && (
            <p className="mt-1 text-xs text-ink-300">
              No STRIPE_SECRET_KEY configured — checkouts are simulated.
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-ink-300">
        Transaction history
      </h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.results.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm text-white">{t.workspace?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      t.reason === 'TOPUP'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-mauve-magic/15 text-mauve-magic'
                    }`}
                  >
                    {t.reason === 'TOPUP' ? 'Payment' : 'Admin adjustment'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-ink-300">
                  {t.delta > 0 ? '+' : ''}
                  {t.delta}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-ink-300">
                  {formatCents(t.amountCents)}
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">
                  {new Date(t.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {transactions && transactions.results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'No transactions yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
