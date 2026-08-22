import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Coins,
  Send,
  ListChecks,
  Search,
  Building2,
  Plus,
  ArrowUpRight,
  Activity,
  MailOpen,
  TrendingDown,
} from 'lucide-react';
import { useGetBillingSummaryQuery, useListBillingTransactionsQuery } from '../api/billingApi.js';
import { useGetOnboardingQuery, useGetDashboardStatsQuery } from '../api/dashboardApi.js';
import { EmailVerifier } from '../components/EmailVerifier.jsx';
import { GettingStarted } from '../components/app/GettingStarted.jsx';
import { ResourcesStrip } from '../components/app/ResourcesStrip.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, TableFrame, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { InfoHint } from '../components/ui/Tooltip.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { SkeletonRows, Skeleton } from '../components/ui/Skeleton.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';

export const REASON_LABELS = {
  MONTHLY_GRANT: 'Monthly grant',
  EMAIL_REVEAL: 'Reveal',
  COMPANY_VIEW: 'Company view',
  CSV_EXPORT: 'CSV export',
  SEQUENCE_ENROLLMENT: 'Sequence enrollment',
  TOPUP: 'Payment',
  ADJUSTMENT: 'Adjustment',
  ONBOARDING_REWARD: 'Onboarding reward',
};

const QUICK_ACTIONS = [
  { to: '/app/people', label: 'Search people', icon: Search },
  { to: '/app/companies', label: 'Search companies', icon: Building2 },
  { to: '/app/sequences/new', label: 'New sequence', icon: Plus },
  { to: '/app/billing/add-credits', label: 'Add credits', icon: Coins },
];

const VIEWS = ['getting-started', 'overview', 'tools'];
const DONE_KEY = 'dp-onboarding-done';

function readDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Home (docs/UX-ROADMAP.md Phase 3): a getting-started hub while the
 * checklist is open, the stats overview once it's done, and a Tools tab
 * for the standalone email verifier. The view lives in `?view=` so it's
 * linkable (the sidebar card and reward toasts deep-link to the checklist);
 * the default flips to Overview the first time the checklist reads 100%.
 */
export function Dashboard() {
  const user = useSelector((s) => s.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  // Always re-read on arriving Home: the people search completes a task
  // without any mutation to invalidate the cache, and this is where the
  // "+5 credits" toast for it should land.
  const { data: progress, isLoading: loadingProgress } = useGetOnboardingQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const done = progress ? progress.percent >= 100 : readDone();
  useEffect(() => {
    if (!progress) return;
    try {
      localStorage.setItem(DONE_KEY, progress.percent >= 100 ? '1' : '0');
    } catch {
      // storage unavailable — the default just recomputes from the query next time
    }
  }, [progress]);

  const requested = searchParams.get('view');
  const view = VIEWS.includes(requested) ? requested : done ? 'overview' : 'getting-started';

  function setView(next) {
    const params = new URLSearchParams(searchParams);
    params.set('view', next);
    setSearchParams(params, { replace: true });
  }

  const tabs = [
    {
      key: 'getting-started',
      label: 'Getting started',
      count: progress ? `${progress.completedCount}/${progress.totalCount}` : undefined,
      emphasize: !done,
    },
    { key: 'overview', label: 'Overview' },
    { key: 'tools', label: 'Tools' },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description={
          view === 'getting-started' && !done
            ? 'A few quick tasks to get the most out of DataPit — each one earns credits.'
            : 'Your workspace at a glance.'
        }
        actions={
          <Button variant="hero" icon={Search} to="/app/people">
            Find people
          </Button>
        }
        tabs={tabs}
        activeTab={view}
        onTabChange={setView}
      />

      {view === 'getting-started' && <GettingStarted progress={progress} isLoading={loadingProgress} />}
      {view === 'overview' && <Overview />}
      {view === 'tools' && (
        <div className="max-w-2xl">
          <EmailVerifier />
        </div>
      )}

      {view !== 'tools' && (
        <section className="mt-8" aria-labelledby="resources-heading">
          <h2 id="resources-heading" className="mb-3 text-sm font-bold text-text">
            Resources
          </h2>
          <ResourcesStrip />
        </section>
      )}
    </div>
  );
}

function Overview() {
  const { data: summary } = useGetBillingSummaryQuery();
  const { data: stats, isLoading: loadingStats } = useGetDashboardStatsQuery();
  const { data: recent, isLoading: loadingRecent } = useListBillingTransactionsQuery({
    page: 1,
    pageSize: 5,
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          to="/app/billing"
          icon={Coins}
          label="Credits"
          hint="Your current balance. Every email reveal costs 2 credits; monthly grants reset each billing cycle."
          value={summary?.balance}
          loading={!summary}
        />
        <StatTile
          to="/app/billing"
          icon={MailOpen}
          label="Reveals this month"
          hint="Email addresses your workspace has unlocked since the 1st of this month."
          value={stats?.revealsThisMonth}
          loading={loadingStats}
        />
        <StatTile
          to="/app/billing"
          icon={TrendingDown}
          label="Credits used this month"
          hint="Credits spent on reveals, company views, exports and enrollments since the 1st."
          value={stats?.creditsUsedThisMonth}
          loading={loadingStats}
        />
        <StatTile
          to="/app/sequences"
          icon={Send}
          label="Active sequences"
          hint="Sequences currently sending — paused and draft sequences aren't counted."
          value={stats?.activeSequences}
          loading={loadingStats}
        />
        <StatTile
          to="/app/lists"
          icon={ListChecks}
          label="Saved lists"
          hint="Named lists of people or companies you've saved from search."
          value={stats?.lists}
          loading={loadingStats}
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
                  <td className={tdClass}>{REASON_LABELS[t.reason] ?? t.reason}</td>
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
                      illustration={<Illustration.Activity />}
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

function StatTile({ to, icon: Icon, label, hint, value, loading = false }) {
  return (
    <Card className="group relative p-4 transition-colors hover:border-text-muted/40">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
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
      {loading ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-text">{value ?? '—'}</p>
      )}
    </Card>
  );
}
