import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchCompaniesQuery, toQueryString } from '../api/searchApi.js';
import { FacetPanel } from '../components/FacetPanel.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { AddToListButton } from '../components/AddToListButton.jsx';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { industry: [], location: [], techStack: [] };

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function Companies() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const searchArgs = { q: q || undefined, ...filters, page, pageSize: PAGE_SIZE };
  const { data, isFetching, isError } = useSearchCompaniesQuery(searchArgs);

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text">Companies</h1>
        <ExportCsvButton
          path={`/search/companies/export?${toQueryString({ q: q || undefined, ...filters })}`}
        />
      </div>
      <input
        type="search"
        placeholder="Search by company name…"
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
        className="mt-4 w-full max-w-md rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text focus:border-focus focus:outline-none"
      />

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-8">
        <FacetPanel groups={facetGroups} />

        <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface-elevated">
          {isError && (
            <p className="p-4 text-sm text-red-600">Search failed. Is the backend running?</p>
          )}

          {!isError && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-text-muted">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Headcount</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.results.map((company) => (
                    <tr key={company.id} className="border-b border-border hover:bg-surface">
                      <td className="px-4 py-3 text-sm font-medium text-text">
                        <Link
                          to={`/app/companies/${company.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {company.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{company.domain}</td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {company.industry ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums text-text-muted">
                        {company.headcountMin ?? '—'}
                        {company.headcountMax ? `–${company.headcountMax}` : ''}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {company.location ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AddToListButton type="COMPANIES" companyId={company.id} />
                      </td>
                    </tr>
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
