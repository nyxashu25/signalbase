import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useListAdminUsersQuery } from '../../api/adminDataApi.js';

const PAGE_SIZE = 25;

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isFetching } = useListAdminUsersQuery({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Users</h1>

      <input
        type="search"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => {
          setPage(1);
          setSearch(e.target.value);
        }}
        className="mt-4 w-full max-w-md rounded-md border border-white/15 bg-white/5 px-3.5 py-2 text-sm text-white outline-none focus:border-neon-violet"
      />

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/control/users/${u.id}`}
                    className="font-medium text-white hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">{u.email}</td>
                <td className="px-4 py-3 text-sm text-ink-300">{u.workspace?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm">
                  {u.suspendedAt ? (
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">
                      Suspended
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'No users found'}
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
