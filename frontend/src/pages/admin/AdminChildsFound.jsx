import { useState } from 'react';
import {
  useListLostChildrenQuery,
  useResolveLostChildMutation,
} from '../../api/adminDataApi.js';

const PAGE_SIZE = 25;

// The user-facing name for the LostChild queue: contacts whose LinkedIn
// job title no longer matches what the database says. Apply updates the
// shared contact (every workspace sees the new title, and it's audited);
// Dismiss leaves the record as-is.
const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'DISMISSED', label: 'Dismissed' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  APPLIED: 'bg-emerald-500/15 text-emerald-400',
  DISMISSED: 'bg-white/10 text-ink-300',
};

export function AdminChildsFound() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const { data, isFetching } = useListLostChildrenQuery({ status, page, pageSize: PAGE_SIZE });
  const [resolve, { isLoading: resolving }] = useResolveLostChildMutation();

  async function handleResolve(row, resolution) {
    setError(null);
    try {
      await resolve({ id: row.id, resolution }).unwrap();
    } catch (err) {
      setError(err.data?.error?.message ?? 'Could not update the entry');
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Childs found</h1>
      <p className="mt-1 text-sm text-ink-300">
        Contacts whose job title on LinkedIn no longer matches ours, reported by the extension.
        Applying updates the contact for every workspace and reindexes search.
      </p>

      <div className="mt-4 inline-flex rounded-md border border-white/15 p-0.5">
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

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Current title</th>
              <th className="px-4 py-3">Observed on LinkedIn</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.lostChildren.map((lc) => (
              <tr key={lc.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm">
                  <span className="block font-medium text-white">
                    {lc.contact ? `${lc.contact.firstName} ${lc.contact.lastName}` : '(contact removed)'}
                  </span>
                  <span className="block text-xs text-ink-300">{lc.contact?.company?.name ?? '—'}</span>
                  {lc.contact?.linkedinUrl && (
                    <a
                      href={lc.contact.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-mauve-magic hover:underline"
                    >
                      {lc.linkedinSlug}
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">{lc.oldTitle ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-medium text-white">{lc.newTitle}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-ink-300">{lc.reportCount}</td>
                <td className="px-4 py-3 text-sm text-ink-300">
                  {new Date(lc.lastReportedAt).toLocaleString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                  {lc.status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={resolving}
                        onClick={() => handleResolve(lc, 'APPLIED')}
                        className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                      >
                        Apply new title
                      </button>
                      <button
                        type="button"
                        disabled={resolving}
                        onClick={() => handleResolve(lc, 'DISMISSED')}
                        className="rounded-md bg-white/10 px-2 py-1 font-bold text-ink-300 hover:bg-white/15 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </span>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 font-bold ${STATUS_STYLES[lc.status]}`}>
                      {lc.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data && data.lostChildren.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'Nothing here — every record matches LinkedIn'}
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
