import { useState } from 'react';
import { useSearchPeopleQuery } from '../api/searchApi.js';
import { FacetPanel } from '../components/FacetPanel.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { ContactRow } from '../components/ContactRow.jsx';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { seniority: [], department: [], industry: [], location: [] };

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function People() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isFetching, isError } = useSearchPeopleQuery({
    q: q || undefined,
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  });

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
      <h1 className="text-xl font-semibold">People</h1>
      <input
        type="search"
        placeholder="Search by name or title…"
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
        className="mt-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <div className="mt-6 flex gap-8">
        <FacetPanel groups={facetGroups} />

        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white">
          {isError && (
            <p className="p-4 text-sm text-red-600">Search failed. Is the backend running?</p>
          )}

          {!isError && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
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
                    <ContactRow key={contact.id} contact={contact} />
                  ))}
                  {data && data.results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                        {isFetching ? 'Searching…' : 'No matches'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {data && (
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
