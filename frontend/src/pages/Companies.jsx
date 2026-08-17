import { useState } from 'react';
import { useSearchCompaniesQuery } from '../api/searchApi.js';
import { FacetPanel } from '../components/FacetPanel.jsx';
import { Pagination } from '../components/Pagination.jsx';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { industry: [], location: [], techStack: [] };

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function Companies() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isFetching, isError } = useSearchCompaniesQuery({
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
    { key: 'industry', label: 'Industry' },
    { key: 'location', label: 'Location' },
    { key: 'techStack', label: 'Tech stack' },
  ].map((g) => ({
    ...g,
    options: data?.facets?.[g.key] ?? [],
    selected: filters[g.key],
    onToggle: (value) => updateFacet(g.key, value),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Companies</h1>
      <input
        type="search"
        placeholder="Search by company name…"
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
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Headcount</th>
                    <th className="px-4 py-3">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map((company) => (
                    <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {company.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{company.domain}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {company.industry ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-slate-600">
                        {company.headcountMin ?? '—'}
                        {company.headcountMax ? `–${company.headcountMax}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {company.location ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {data && data.results.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
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
