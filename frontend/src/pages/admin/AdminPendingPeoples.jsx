import { Fragment, useState } from 'react';
import {
  useListMissingPersonsQuery,
  useResolveMissingPersonMutation,
} from '../../api/adminDataApi.js';

const PAGE_SIZE = 25;

// The user-facing name for the MissingPerson queue: LinkedIn profiles the
// Chrome extension saw that we have no contact for. The data team sources
// them (usually via an Extend Database CSV — imports auto-mark matching rows
// as Added), or dismisses the ones not worth chasing.
const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'ADDED', label: 'Added' },
  { key: 'DISMISSED', label: 'Dismissed' },
];

const STATUS_STYLES = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  ADDED: 'bg-emerald-500/15 text-emerald-400',
  DISMISSED: 'bg-white/10 text-ink-300',
};

// One row of the RPF CSV format the Extend Database importer takes —
// copyable so a sourced profile can be pasted straight into a sheet.
function toRpfRow(p) {
  const name = (p.name ?? '').trim();
  const spaceAt = name.lastIndexOf(' ');
  const firstName = spaceAt > 0 ? name.slice(0, spaceAt) : name;
  const lastName = spaceAt > 0 ? name.slice(spaceAt + 1) : '';
  return [firstName, lastName, p.jobTitle ?? '', p.companyName ?? '', p.location ?? '', p.linkedinUrl].join(',');
}

export function AdminPendingPeoples() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState(null);
  const { data, isFetching } = useListMissingPersonsQuery({ status, page, pageSize: PAGE_SIZE });
  const [resolve, { isLoading: resolving }] = useResolveMissingPersonMutation();

  async function handleResolve(row, resolution) {
    setError(null);
    try {
      await resolve({ id: row.id, resolution }).unwrap();
    } catch (err) {
      setError(err.data?.error?.message ?? 'Could not update the entry');
    }
  }

  async function copyRpf(row) {
    try {
      await navigator.clipboard.writeText(toRpfRow(row));
      setCopiedId(row.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable — the fields are visible in the row
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Pending peoples</h1>
      <p className="mt-1 text-sm text-ink-300">
        LinkedIn profiles the extension looked up that aren't in the database yet — sorted by most
        recently seen. Report count = how many times someone wanted this person.
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
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Reports</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.missingPersons.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-sm">
                    <span className="block font-medium text-white">{p.name ?? '(name not captured)'}</span>
                    <span className="block text-xs text-ink-300">{p.jobTitle ?? '—'}</span>
                    <a
                      href={p.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-mauve-magic hover:underline"
                    >
                      {p.linkedinSlug}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-300">{p.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-ink-300">{p.location ?? '—'}</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-ink-300">{p.reportCount}</td>
                  <td className="px-4 py-3 text-sm text-ink-300">
                    {new Date(p.lastReportedAt).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      {p.domText && (
                        <button
                          type="button"
                          onClick={() => setExpandedId((id) => (id === p.id ? null : p.id))}
                          className="rounded-md border border-white/15 px-2 py-1 font-bold text-ink-300 hover:bg-white/5"
                        >
                          {expandedId === p.id ? 'Hide text' : 'Page text'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyRpf(p)}
                        className="rounded-md border border-white/15 px-2 py-1 font-bold text-ink-300 hover:bg-white/5"
                      >
                        {copiedId === p.id ? 'Copied' : 'Copy as RPF row'}
                      </button>
                      {p.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={resolving}
                            onClick={() => handleResolve(p, 'ADDED')}
                            className="rounded-md bg-emerald-500/15 px-2 py-1 font-bold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            Mark added
                          </button>
                          <button
                            type="button"
                            disabled={resolving}
                            onClick={() => handleResolve(p, 'DISMISSED')}
                            className="rounded-md bg-white/10 px-2 py-1 font-bold text-ink-300 hover:bg-white/15 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {p.status !== 'PENDING' && (
                        <span className={`rounded-full px-2.5 py-1 font-bold ${STATUS_STYLES[p.status]}`}>
                          {p.status}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
                {expandedId === p.id && p.domText && (
                  <tr className="border-b border-white/5 bg-ink-950/60">
                    <td colSpan={6} className="px-4 py-3">
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs text-ink-300">
                        {p.domText}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data && data.missingPersons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'Nothing here — the queue is clear'}
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
