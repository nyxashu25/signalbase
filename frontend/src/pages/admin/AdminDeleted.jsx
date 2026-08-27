import {
  useListAdminDeletedQuery,
  useRestoreAdminUserMutation,
  useRestoreAdminWorkspaceMutation,
} from '../../api/adminDataApi.js';

function daysLeft(purgeAt) {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (24 * 3600_000)));
}

function PurgeCountdown({ purgeAt }) {
  const days = daysLeft(purgeAt);
  return (
    <span className={days <= 7 ? 'font-bold text-red-400' : 'text-ink-300'}>
      {days === 0 ? 'purging today' : `${days} day${days === 1 ? '' : 's'} left`}
    </span>
  );
}

// The soft-delete holding pen: everything an admin deleted, restorable until
// the deletion-purge job hard-removes it 60 days after deletion.
export function AdminDeleted() {
  const { data, isLoading } = useListAdminDeletedQuery();
  const [restoreUser, { isLoading: restoringUser }] = useRestoreAdminUserMutation();
  const [restoreWorkspace, { isLoading: restoringWorkspace }] = useRestoreAdminWorkspaceMutation();

  if (isLoading || !data) return <p className="text-sm text-ink-300">Loading…</p>;

  const empty = data.users.length === 0 && data.workspaces.length === 0;

  return (
    <div className="max-w-3xl">
      <h1 className="text-lg font-bold text-white">Deleted</h1>
      <p className="mt-1 text-sm text-ink-300">
        Soft-deleted users and workspaces wait here for 60 days — restore them any time before the
        purge job permanently removes them.
      </p>

      {empty && (
        <p className="mt-6 rounded-lg border border-white/10 bg-ink-900 p-6 text-sm text-ink-300">
          Nothing is deleted right now.
        </p>
      )}

      {data.users.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-ink-900">
          <p className="border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-300">
            Users ({data.users.length})
          </p>
          <table className="w-full text-sm">
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-ink-300">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-300">
                    deleted {new Date(u.deletedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <PurgeCountdown purgeAt={u.purgeAt} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      disabled={restoringUser}
                      onClick={() => restoreUser(u.id)}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-white/5 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.workspaces.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-ink-900">
          <p className="border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-300">
            Workspaces ({data.workspaces.length})
          </p>
          <table className="w-full text-sm">
            <tbody>
              {data.workspaces.map((w) => (
                <tr key={w.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-white">{w.name}</p>
                    <p className="text-xs text-ink-300">{w.plan} plan</p>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-300">
                    deleted {new Date(w.deletedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <PurgeCountdown purgeAt={w.purgeAt} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      disabled={restoringWorkspace}
                      onClick={() => restoreWorkspace(w.id)}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-white/5 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
