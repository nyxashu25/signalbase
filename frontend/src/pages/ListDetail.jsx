import { Link, useParams } from 'react-router-dom';
import { useGetListQuery, useRemoveListItemMutation } from '../api/listsApi.js';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';

export function ListDetail() {
  const { id } = useParams();
  const { data: list, isLoading } = useGetListQuery(id);
  const [removeItem] = useRemoveListItemMutation();

  if (isLoading || !list) {
    return <p className="text-sm text-text-muted">Loading…</p>;
  }

  const isContacts = list.type === 'CONTACTS';

  return (
    <div>
      <Link to="/app/lists" className="text-sm font-medium text-primary hover:underline">
        &larr; Back to lists
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{list.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {isContacts ? 'Contacts' : 'Companies'} &middot; {list.items.length} saved
          </p>
        </div>
        {list.items.length > 0 && <ExportCsvButton path={`/lists/${list.id}/export`} />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface-elevated">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
              {isContacts ? (
                <>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Company</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Industry</th>
                </>
              )}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-surface">
                {isContacts ? (
                  <>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {item.contact?.firstName} {item.contact?.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.contact?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {item.contact?.company?.name ?? '—'}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm font-medium text-text">{item.company?.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.company?.domain}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{item.company?.industry ?? '—'}</td>
                  </>
                )}
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem({ listId: list.id, itemId: item.id })}
                    className="text-xs font-medium text-text-muted hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {list.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-text-muted">
                  Nothing saved to this list yet — add {isContacts ? 'contacts' : 'companies'} from
                  search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
