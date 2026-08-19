import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { searchApi, useSearchPeopleQuery } from '../api/searchApi.js';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { FacetPanel } from '../components/FacetPanel.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { ContactRow } from '../components/ContactRow.jsx';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { seniority: [], department: [], industry: [], location: [] };

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function People() {
  const dispatch = useDispatch();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const queryArgs = { q: q || undefined, ...filters, page, pageSize: PAGE_SIZE };
  const { data, isFetching, isError } = useSearchPeopleQuery(queryArgs);
  const [revealContact] = useRevealContactMutation();

  async function handleReveal(contactId) {
    const result = await revealContact({ contactId, idempotencyKey: crypto.randomUUID() }).unwrap();

    // Patch the cached page in place rather than refetching — a refetch
    // would re-run the ES query and could reshuffle/repaginate results out
    // from under the user for something that only changed one row.
    dispatch(
      searchApi.util.updateQueryData('searchPeople', queryArgs, (draft) => {
        const contact = draft.results.find((c) => c.id === contactId);
        if (contact) {
          contact.email = result.email;
          contact.emailVerified = result.emailVerified;
          contact.revealed = true;
        }
      }),
    );
  }

  function updateFacet(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: toggle(f[key], value) }));
  }

  const facetGroups = [
    { key: 'seniority', label: 'Seniority' },
    { key: 'department', label: 'Department' },
    { key: 'industry', label: 'Company industry' },
    { key: 'location', label: 'Company location' },
  ].map((g) => ({
    ...g,
    options: data?.facets?.[g.key] ?? [],
    selected: filters[g.key],
    onToggle: (value) => updateFacet(g.key, value),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold text-text">People</h1>
      <input
        type="search"
        placeholder="Search by name or title…"
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
        className="mt-4 w-full max-w-md rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text focus:border-focus focus:outline-none"
      />

      <div className="mt-6 flex gap-8">
        <FacetPanel groups={facetGroups} />

        <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface-elevated">
          {isError && <p className="p-4 text-sm text-red-600">Search failed. Is the backend running?</p>}

          {!isError && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map((contact) => (
                    <ContactRow key={contact.id} contact={contact} onReveal={handleReveal} />
                  ))}
                  {data && data.results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                        {isFetching ? 'Searching…' : 'No matches'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && (
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
          )}
        </div>
      </div>
    </div>
  );
}
