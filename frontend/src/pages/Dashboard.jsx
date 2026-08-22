import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Coins, Send, ListChecks, Search, Building2, Plus, ArrowUpRight, Activity } from 'lucide-react';
import { useGetBillingSummaryQuery, useListBillingTransactionsQuery } from '../api/billingApi.js';
import { useListSequencesQuery } from '../api/sequencesApi.js';
import { useListListsQuery } from '../api/listsApi.js';
import { EmailVerifier } from '../components/EmailVerifier.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, TableFrame, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { InfoHint } from '../components/ui/Tooltip.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';

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
  { to: '/app/people', label: 'Search people', icon: Search },
  { to: '/app/companies', label: 'Search companies', icon: Building2 },
  { to: '/app/sequences/new', label: 'New sequence', icon: Plus },
  { to: '/app/billing/add-credits', label: 'Add credits', icon: Coins },
];

// Phase 3 of docs/UX-ROADMAP.md turns this into the getting-started hub;
// this pass just moves it onto the shared primitives (PageHeader, stat
// tiles with ⓘ hints, skeleton/empty states) so it matches the rest of
// the shell in the meantime.
export function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const { data: summary } = useGetBillingSummaryQuery();
  const { data: recent, isLoading: loadingRecent } = useListBillingTransactionsQuery({
    page: 1,
    pageSize: 5,
  });
  const { data: sequences } = useListSequencesQuery();
  const { data: lists } = useListListsQuery();

  const activeSequences = sequences?.filter((s) => s.status === 'ACTIVE').length ?? 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="Your workspace at a glance."
        actions={
          <Button variant="hero" icon={Search} to="/app/people">
            Find people
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          to="/app/billing"
          icon={Coins}
          label="Credits"
          hint="Your current balance. Every email reveal costs 2 credits; monthly grants reset each billing cycle."
          value={summary?.balance}
        />
        <StatTile
          to="/app/sequences"
          icon={Send}
          label="Active sequences"
          hint="Sequences currently sending — paused and draft sequences aren't counted."
          value={activeSequences}
        />
        <StatTile
          to="/app/lists"
          icon={ListChecks}
          label="Saved lists"
          hint="Named lists of people or companies you've saved from search."
          value={lists?.length}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.to} variant="secondary" size="sm" icon={action.icon} to={action.to}>
            {action.label}
          </Button>
        ))}
      </div>

      <div className="mt-8">
        <EmailVerifier />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Recent activity</h2>
          <Link to="/app/billing" className="text-xs font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <TableFrame>
          <table className="w-full">
            <tbody>
              {loadingRecent && <SkeletonRows rows={4} columns={4} />}
              {recent?.results.map((t) => (
                <tr key={t.id} className={trClass}>
                  <td className={tdClass}>{REASON_LABELS[t.reason]}</td>
                  <td className={tdMutedClass}>
                    {t.contact ? `${t.contact.firstName} ${t.contact.lastName}` : '—'}
                  </td>
                  <td className={`${tdMutedClass} tabular-nums`}>
                    {t.delta > 0 ? '+' : ''}
                    {t.delta} credits
                  </td>
                  <td className={`${tdMutedClass} text-right`}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recent && recent.results.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      compact
                      icon={Activity}
                      title="No activity yet"
                      actions={
                        <Button variant="primary" size="sm" icon={Search} to="/app/people">
                          Search people
                        </Button>
                      }
                    >
                      Search for people or companies and reveal a contact to see it here.
                    </EmptyState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableFrame>
      </div>
    </div>
  );
}

function StatTile({ to, icon: Icon, label, hint, value }) {
  return (
    <Card className="group relative p-4 transition-colors hover:border-text-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
          <InfoHint content={hint} />
        </div>
        <Link
          to={to}
          aria-label={`Open ${label}`}
          className="rounded-sm p-0.5 text-text-muted/60 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-text">
        {value ?? '—'}
      </p>
    </Card>
  );
}
