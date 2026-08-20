import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListTicketsQuery } from '../api/ticketsApi.js';
import { Pagination } from '../components/Pagination.jsx';

const PAGE_SIZE = 25;

const TABS = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'UNANSWERED', label: 'Unanswered' },
  { key: 'ANSWERED', label: 'Answered' },
  { key: 'CLOSED', label: 'Closed' },
];

const TYPE_LABELS = { SUPPORT: 'Support', SALES: 'Sales' };

const STATUS_STYLES = {
  UNANSWERED: 'bg-amber-500/15 text-amber-600',
  ANSWERED: 'bg-emerald-500/15 text-emerald-600',
  CLOSED: 'bg-surface text-text-muted',
};

const STATUS_LABELS = {
  UNANSWERED: 'Awaiting reply',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
};

export function Tickets() {
  const [status, setStatus] = useState('ACTIVE');
  const [page, setPage] = useState(1);
  const { data, isFetching } = useListTicketsQuery({ status, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Tickets</h1>
        <Link
          to="/app/tickets/new"
          className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)]"
        >
          New ticket
        </Link>
      </div>

      <div className="mt-6 inline-flex rounded-md border border-border p-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatus(tab.key);
              setPage(1);
            }}
            className={`rounded px-3 py-1.5 text-xs font-bold ${
              status === tab.key ? 'bg-gradient-action text-white' : 'text-text-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last update</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((t) => (
              <tr key={t.id} className="border-b border-border hover:bg-surface">
                <td className="px-4 py-3 text-sm">
                  <Link to={`/app/tickets/${t.id}`} className="font-medium text-text hover:underline">
                    {t.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">{TYPE_LABELS[t.type]}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[t.status]}`}>
                    {STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-text-muted">
                  {new Date(t.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  {isFetching ? 'Loading…' : 'No tickets here'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
