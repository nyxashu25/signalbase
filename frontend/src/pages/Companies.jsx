import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Factory,
  MapPin,
  Cpu,
  Users,
  Globe,
  SlidersHorizontal,
  Building2,
  RotateCcw,
} from 'lucide-react';
import { useSearchCompaniesQuery, toQueryString } from '../api/searchApi.js';
import { Pagination } from '../components/Pagination.jsx';
import { AddToListButton } from '../components/AddToListButton.jsx';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';
import { LinkedInIcon } from '../components/LinkedInIcon.jsx';
import { FilterRail } from '../components/search/FilterRail.jsx';
import { BulkActionBar } from '../components/search/BulkActionBar.jsx';
import { BulkAddToList } from '../components/search/BulkAddToList.jsx';
import { SavedSearchesMenu } from '../components/search/SavedSearchesMenu.jsx';
import { ColumnPicker, useVisibleColumns } from '../components/search/ColumnPicker.jsx';
import { SortSelect } from '../components/search/SortSelect.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Toolbar, SearchInput } from '../components/ui/Toolbar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { TableFrame, thClass, tdClass, tdMutedClass, trClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { StatusPill, CountPill } from '../components/ui/StatusPill.jsx';
import { LetterAvatar } from '../components/ui/LetterAvatar.jsx';
import { Tooltip } from '../components/ui/Tooltip.jsx';

const EMPTY_FILTERS = { industry: [], location: [], techStack: [], headcount: [] };
const FILTER_KEYS = Object.keys(EMPTY_FILTERS);

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'headcount_desc', label: 'Largest first' },
  { value: 'newest', label: 'Newest' },
];

const HEADCOUNT_LABELS = {
  '1-10': '1–10',
  '11-50': '11–50',
  '51-200': '51–200',
  '201-500': '201–500',
  '501-1000': '501–1,000',
  '1001-5000': '1,001–5,000',
  '5001+': '5,001+',
};

const COLUMNS = [
  { key: 'name', label: 'Name', locked: true },
  { key: 'links', label: 'Links' },
  { key: 'industry', label: 'Industry' },
  { key: 'employees', label: 'Employees' },
  { key: 'location', label: 'Location' },
];
const DEFAULT_COLUMNS = COLUMNS.map((c) => c.key);

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function headcountLabel(min, max) {
  if (!min && !max) return null;
  if (min && max) return `${min.toLocaleString()}–${max.toLocaleString()}`;
  return `${(min ?? max).toLocaleString()}+`;
}

export function Companies() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [railOpen, setRailOpen] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [visibleColumns, toggleColumn] = useVisibleColumns('dp-companies-columns', DEFAULT_COLUMNS);

  const queryArgs = useMemo(
    () => ({ q: q || undefined, ...filters, sort, page, pageSize }),
    [q, filters, sort, page, pageSize],
  );
  const { data, isFetching, isError } = useSearchCompaniesQuery(queryArgs);

  // Reset selection whenever the visible row set changes (see People.jsx).
  const visibleIdsKey = (data?.results ?? []).map((c) => c.id).join(',');
  useEffect(() => {
    setSelected(new Set());
  }, [visibleIdsKey]);

  const activeFilterCount = FILTER_KEYS.reduce((n, k) => n + filters[k].length, 0);
  const hasActiveFilters = activeFilterCount > 0 || Boolean(q);

  function resetAll() {
    setQ('');
    setFilters(EMPTY_FILTERS);
    setSort('relevance');
    setPage(1);
  }
  function updateFacet(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: toggle(f[key], value) }));
  }
  function applySaved(saved) {
    const next = { ...EMPTY_FILTERS };
    for (const key of FILTER_KEYS) if (Array.isArray(saved[key])) next[key] = saved[key];
    setFilters(next);
    setQ(typeof saved.q === 'string' ? saved.q : '');
    setSort(SORT_OPTIONS.some((o) => o.value === saved.sort) ? saved.sort : 'relevance');
    setPage(1);
  }

  const results = data?.results ?? [];
  const pageIds = results.map((c) => c.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  function toggleAllOnPage(checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }
  function toggleOne(id, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const facets = data?.facets ?? {};
  const railGroups = [
    {
      key: 'industry',
      label: 'Industry',
      icon: Factory,
      type: 'checkbox',
      options: facets.industry ?? [],
      selected: filters.industry,
      onToggle: (v) => updateFacet('industry', v),
    },
    {
      key: 'headcount',
      label: '# Employees',
      icon: Users,
      type: 'checkbox',
      options: (facets.headcount ?? []).map((o) => ({ ...o, label: HEADCOUNT_LABELS[o.value] })),
      selected: filters.headcount,
      onToggle: (v) => updateFacet('headcount', v),
    },
    {
      key: 'location',
      label: 'Location',
      icon: MapPin,
      type: 'checkbox',
      options: facets.location ?? [],
      selected: filters.location,
      onToggle: (v) => updateFacet('location', v),
    },
    {
      key: 'techStack',
      label: 'Tech stack',
      icon: Cpu,
      type: 'checkbox',
      options: facets.techStack ?? [],
      selected: filters.techStack,
      onToggle: (v) => updateFacet('techStack', v),
    },
  ];

  const exportPath = `/search/companies/export?${toQueryString({ ...queryArgs, page: undefined, pageSize: undefined })}`;
  const currentFilters = {
    ...(q ? { q } : {}),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v.length > 0)),
    ...(sort !== 'relevance' ? { sort } : {}),
  };
  const show = (key) => visibleColumns.includes(key);
  const columnCount = visibleColumns.length + 2;

  return (
    <div>
      <PageHeader
        title="Find companies"
        subtitle={data ? `${data.total.toLocaleString()} ${data.total === 1 ? 'company' : 'companies'}` : undefined}
        actions={
          <>
            <SavedSearchesMenu
              type="COMPANIES"
              currentFilters={currentFilters}
              hasActiveFilters={hasActiveFilters}
              onApply={applySaved}
            />
            <ExportCsvButton path={exportPath} />
          </>
        }
      />

      <Toolbar
        left={
          <>
            <Button
              variant="secondary"
              icon={SlidersHorizontal}
              onClick={() => setRailOpen((v) => !v)}
              aria-pressed={railOpen}
              className="hidden md:inline-flex"
            >
              {railOpen ? 'Hide filters' : 'Show filters'}
              {activeFilterCount > 0 && <CountPill tone="accent">{activeFilterCount}</CountPill>}
            </Button>
            <SearchInput
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search by company name…"
              className="w-72"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetAll}>
                Reset
              </Button>
            )}
          </>
        }
        right={
          <>
            <SortSelect
              value={sort}
              onChange={(v) => {
                setPage(1);
                setSort(v);
              }}
              options={SORT_OPTIONS}
            />
            <ColumnPicker columns={COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
          </>
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <FilterRail
          groups={railGroups}
          total={data?.total}
          isFetching={isFetching}
          className={railOpen ? '' : 'md:hidden'}
        />

        <div className="min-w-0 flex-1">
          {isError ? (
            <Banner tone="danger" title="Search is unavailable right now">
              We couldn&rsquo;t reach the search service. Try again in a moment.
            </Banner>
          ) : (
            <TableFrame>
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr>
                    <th className={`${thClass} w-10 !px-3`}>
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={(e) => toggleAllOnPage(e.target.checked)}
                        aria-label="Select all on this page"
                        disabled={pageIds.length === 0}
                        className="h-4 w-4 rounded-sm border-border"
                      />
                    </th>
                    {COLUMNS.filter((c) => show(c.key)).map((c) => (
                      <th key={c.key} className={thClass}>
                        {c.label}
                      </th>
                    ))}
                    <th className={thClass}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching && !data && <SkeletonRows rows={8} columns={columnCount} />}
                  {results.map((company) => {
                    const isSelected = selected.has(company.id);
                    const headcount = headcountLabel(company.headcountMin, company.headcountMax);
                    return (
                      <tr key={company.id} className={`${trClass} ${isSelected ? 'bg-primary/5' : ''}`}>
                        <td className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleOne(company.id, e.target.checked)}
                            aria-label={`Select ${company.name}`}
                            className="h-4 w-4 rounded-sm border-border"
                          />
                        </td>
                        <td className={tdClass}>
                          <Link
                            to={`/app/companies/${company.id}`}
                            className="flex items-center gap-2.5 font-semibold hover:text-primary hover:underline"
                          >
                            <LetterAvatar name={company.name} size="md" square />
                            <span className="min-w-0">
                              <span className="block truncate">{company.name}</span>
                              {company.domain && (
                                <span className="block truncate text-xs font-normal text-text-muted">
                                  {company.domain}
                                </span>
                              )}
                            </span>
                          </Link>
                        </td>
                        {show('links') && (
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1">
                              {company.domain && (
                                <Tooltip content={company.domain}>
                                  <a
                                    href={`https://${company.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${company.name} website`}
                                    className="rounded-sm p-1 text-text-muted hover:bg-surface-hover hover:text-text"
                                  >
                                    <Globe className="h-4 w-4" aria-hidden="true" />
                                  </a>
                                </Tooltip>
                              )}
                              {company.linkedinUrl && (
                                <Tooltip content="LinkedIn">
                                  <a
                                    href={company.linkedinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Open ${company.name} on LinkedIn`}
                                    className="rounded-sm p-1 text-text-muted hover:bg-surface-hover hover:text-text"
                                  >
                                    <LinkedInIcon className="h-4 w-4" />
                                  </a>
                                </Tooltip>
                              )}
                              {!company.domain && !company.linkedinUrl && (
                                <span className="text-sm text-text-muted/50">—</span>
                              )}
                            </span>
                          </td>
                        )}
                        {show('industry') && (
                          <td className="px-4 py-3">
                            {company.industry ? <StatusPill>{company.industry}</StatusPill> : <span className="text-sm text-text-muted">—</span>}
                          </td>
                        )}
                        {show('employees') && (
                          <td className={`${tdMutedClass} tabular-nums`}>
                            {headcount ? (
                              <StatusPill tone="info">{headcount}</StatusPill>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {show('location') && (
                          <td className={`${tdMutedClass} whitespace-nowrap`}>{company.location ?? '—'}</td>
                        )}
                        <td className="px-4 py-2 text-right">
                          <AddToListButton type="COMPANIES" companyId={company.id} label="Save" />
                        </td>
                      </tr>
                    );
                  })}
                  {data && results.length === 0 && (
                    <tr>
                      <td colSpan={columnCount}>
                        <EmptyState
                          illustration={hasActiveFilters ? <Illustration.Search /> : <Illustration.Companies />}
                          title={hasActiveFilters ? 'No companies match these filters' : 'No companies yet'}
                          actions={
                            hasActiveFilters ? (
                              <Button variant="primary" icon={RotateCcw} onClick={resetAll}>
                                Reset filters
                              </Button>
                            ) : null
                          }
                        >
                          {hasActiveFilters
                            ? 'Try removing a filter or two, or widening the search.'
                            : 'The database is still being populated — check back soon.'}
                        </EmptyState>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {data && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={data.total}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                />
              )}
            </TableFrame>
          )}
        </div>
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <BulkAddToList type="COMPANIES" ids={[...selected]} onDone={() => setSelected(new Set())} />
      </BulkActionBar>
    </div>
  );
}
