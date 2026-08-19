import { useGetAdminOverviewQuery, useGetAdminUsageQuery } from '../../api/adminDataApi.js';

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-300">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">{value ?? '—'}</p>
    </div>
  );
}

export function AdminDashboard() {
  const { data: overview, isLoading: loadingOverview } = useGetAdminOverviewQuery();
  const { data: usage, isLoading: loadingUsage } = useGetAdminUsageQuery();

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Overview</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Workspaces" value={overview?.totalWorkspaces} />
        <StatCard label="Users" value={overview?.totalUsers} />
        <StatCard label="Paying workspaces" value={overview?.paidWorkspaces} />
        <StatCard label="New users (30d)" value={overview?.newUsersLast30Days} />
      </div>

      <h2 className="mt-10 text-sm font-bold uppercase tracking-wide text-ink-300">Data usage</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Emails revealed" value={usage?.totalReveals} />
        <StatCard label="Sequence emails sent" value={usage?.totalSequenceSends} />
      </div>

      {(loadingOverview || loadingUsage) && <p className="mt-6 text-sm text-ink-300">Loading…</p>}
    </div>
  );
}
