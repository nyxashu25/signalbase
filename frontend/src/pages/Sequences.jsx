import { Link } from 'react-router-dom';
import { useListSequencesQuery } from '../api/sequencesApi.js';

const STATUS_STYLES = {
  DRAFT: 'bg-surface text-text-muted',
  ACTIVE: 'bg-emerald-500/15 text-emerald-600',
  PAUSED: 'bg-amber-500/15 text-amber-600',
  ARCHIVED: 'bg-surface text-text-muted',
};

export function Sequences() {
  const { data: sequences, isLoading } = useListSequencesQuery();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Sequences</h1>
        <Link
          to="/app/sequences/new"
          className="rounded-md bg-gradient-action px-4 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(148,0,222,0.24)] transition-transform duration-150 ease-brand hover:-translate-y-px"
        >
          New sequence
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Steps</th>
              <th className="px-4 py-3">Enrolled</th>
            </tr>
          </thead>
          <tbody>
            {sequences?.map((seq) => (
              <tr key={seq.id} className="border-b border-border hover:bg-surface">
                <td className="px-4 py-3 text-sm">
                  <Link
                    to={`/app/sequences/${seq.id}`}
                    className="font-medium text-text hover:text-primary"
                  >
                    {seq.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[seq.status]}`}
                  >
                    {seq.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">{seq._count?.steps ?? 0}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                  {seq._count?.enrollments ?? 0}
                </td>
              </tr>
            ))}
            {sequences && sequences.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  {isLoading ? 'Loading…' : 'No sequences yet — create one to start outreach.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
