import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListAdminTicketsQuery } from '../../api/adminDataApi.js';

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'UNANSWERED', label: 'Unanswered' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'CLOSED', label: 'Closed' },
];

const TYPE_TABS = [
  { key: undefined, label: 'All types' },
  { key: 'SUPPORT', label: 'Support' },
  { key: 'SALES', label: 'Sales' },
];

const STATUS_STYLES = {
  UNANSWERED: 'bg-amber-500/15 text-amber-400',
  ANSWERED: 'bg-emerald-500/15 text-emerald-400',
  CLOSED: 'bg-white/10 text-ink-300',
};

export function AdminTickets() {
  const [status, setStatus] = useState('ACTIVE');
  const [type, setType] = useState(undefined);
  const [page, setPage] = useState(1);
  const { data, isFetching } = useListAdminTicketsQuery({ status, type, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Tickets</h1>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-white/15 p-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`rounded px-3 py-1.5 text-xs font-bold ${
                status === tab.key ? 'bg-gradient-action text-white' : 'text-ink-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-white/15 p-0.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setType(tab.key);
                setPage(1);
              }}
              className={`rounded px-3 py-1.5 text-xs font-bold ${
                type === tab.key ? 'bg-gradient-action text-white' : 'text-ink-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last update</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/control/tickets/${t.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {t.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">{t.type}</td>
                <td className="px-4 py-3 text-sm text-ink-300">{t.workspace?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-ink-300">{t.createdBy?.email ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">
                  {new Date(t.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'No tickets here'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center gap-3 text-sm text-ink-300">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-white/15 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(data.total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            disabled={page * PAGE_SIZE >= data.total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-white/15 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
