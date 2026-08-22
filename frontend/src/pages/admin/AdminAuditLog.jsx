import { useListAdminAuditLogQuery } from '../../api/adminDataApi.js';

const ACTION_LABELS = {
  SUSPEND_USER: 'Suspended user',
  UNSUSPEND_USER: 'Unsuspended user',
  UPDATE_PLAN: 'Changed plan',
  ADD_CREDITS: 'Added credits',
  SAVE_STRIPE_SETTINGS: 'Saved Stripe settings',
  APPROVE_IMPORT: 'Approved import',
  SEND_PROMOTION: 'Sent promotion',
};

function describeMetadata(action, metadata) {
  if (!metadata) return null;
  if (action === 'UPDATE_PLAN') return `${metadata.from} → ${metadata.to}`;
  if (action === 'ADD_CREDITS') return `${metadata.amount > 0 ? '+' : ''}${metadata.amount} credits`;
  if (action === 'SAVE_STRIPE_SETTINGS') {
    return metadata.fields?.length ? `set: ${metadata.fields.join(', ')}` : 'no fields changed';
  }
  if (action === 'APPROVE_IMPORT') {
    return `${metadata.filename ?? metadata.batchId} — ${metadata.insertedContacts ?? 0} contacts, ${metadata.insertedCompanies ?? 0} companies`;
  }
  if (action === 'SEND_PROMOTION') return `“${metadata.subject}” → ${metadata.recipientCount} recipients`;
  return null;
}

export function AdminAuditLog() {
  const { data, isFetching } = useListAdminAuditLogQuery({ page: 1, pageSize: 50 });

  return (
    <div>
      <h1 className="text-xl font-semibold text-white">Audit log</h1>
      <p className="mt-1 text-sm text-ink-300">
        Every sensitive admin action — suspend/unsuspend, plan changes, admin-granted credits, Stripe
        settings saves, import approvals and promotional broadcasts — with who did it and when.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10 bg-ink-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-bold uppercase tracking-wide text-ink-300">
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target user</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.results.map((entry) => (
              <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-sm">
                  <span className="rounded-full bg-mauve-magic/15 px-2.5 py-1 text-xs font-bold text-mauve-magic">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-white">
                  {entry.targetUser?.email ?? entry.targetUser?.id ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-ink-300">
                  {describeMetadata(entry.action, entry.metadata) ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-ink-300">{entry.superAdmin?.email ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-ink-300">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {data && data.results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-300">
                  {isFetching ? 'Loading…' : 'No admin actions recorded yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
