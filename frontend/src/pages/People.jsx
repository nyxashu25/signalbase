import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Briefcase,
  Building2,
  Award,
  Layers,
  Factory,
  MapPin,
  Mail,
  SlidersHorizontal,
  Users,
  RotateCcw,
} from 'lucide-react';
import { searchApi, useSearchPeopleQuery, toQueryString } from '../api/searchApi.js';
import { useRevealContactMutation } from '../api/contactsApi.js';
import { useGetCreditCostsQuery } from '../api/billingApi.js';
import { Pagination } from '../components/Pagination.jsx';
import { ContactRow, CONTACT_COLUMNS } from '../components/ContactRow.jsx';
import { ExportCsvButton } from '../components/ExportCsvButton.jsx';
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
import { TableFrame, thClass } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Illustration } from '../components/ui/illustrations.jsx';
import { SkeletonRows } from '../components/ui/Skeleton.jsx';
import { CountPill } from '../components/ui/StatusPill.jsx';
import { useToast } from '../components/ui/toast.jsx';

const EMPTY_FILTERS = {
  title: '',
  company: '',
  seniority: [],
  department: [],
  industry: [],
  location: [],
  emailStatus: [],
};
const ARRAY_KEYS = ['seniority', 'department', 'industry', 'location', 'emailStatus'];
const TEXT_KEYS = ['title', 'company'];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'newest', label: 'Newest' },
];

const EMAIL_STATUS_LABELS = { verified: 'Verified', unverified: 'Unverified', not_found: 'Not found' };

const DEFAULT_COLUMNS = CONTACT_COLUMNS.map((c) => c.key);

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Only the keys this screen understands are replayed from a saved search —
// anything else stored in `filters` (an older version, a different screen)
// is ignored rather than crashing the query.
function filtersFromSaved(saved) {
  const next = { ...EMPTY_FILTERS };
  for (const key of ARRAY_KEYS) if (Array.isArray(saved[key])) next[key] = saved[key];
  for (const key of TEXT_KEYS) if (typeof saved[key] === 'string') next[key] = saved[key];
  return next;
}

export function People() {
  const dispatch = useDispatch();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [railOpen, setRailOpen] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [revealArmed, setRevealArmed] = useState(false);
  const [bulkRevealing, setBulkRevealing] = useState(false);
  const [visibleColumns, toggleColumn] = useVisibleColumns('dp-people-columns', DEFAULT_COLUMNS);

  const queryArgs = useMemo(
    () => ({
      q: q || undefined,
      title: filters.title || undefined,
      company: filters.company || undefined,
      seniority: filters.seniority,
      department: filters.department,
      industry: filters.industry,
      location: filters.location,
      emailStatus: filters.emailStatus,
      sort,
      page,
      pageSize,
    }),
    [q, filters, sort, page, pageSize],
  );
  const { data, isFetching, isError } = useSearchPeopleQuery(queryArgs);
  const [revealContact] = useRevealContactMutation();
  const { data: costs } = useGetCreditCostsQuery();

  // Any change to which rows are on screen drops the selection — a checked
  // row that scrolled off to another page is a bulk-action footgun. Keyed on
  // the visible ids (not the query args) so it fires when results actually
  // change, and not when a reveal patches a row in place.
  const visibleIdsKey = (data?.results ?? []).map((c) => c.id).join(',');
  useEffect(() => {
    setSelected(new Set());
    setRevealArmed(false);
  }, [visibleIdsKey]);

  const activeFilterCount =
    ARRAY_KEYS.reduce((n, k) => n + filters[k].length, 0) +
    TEXT_KEYS.reduce((n, k) => n + (filters[k] ? 1 : 0), 0);
  const hasActiveFilters = activeFilterCount > 0 || Boolean(q);

  function resetAll() {
    setQ('');
    setFilters(EMPTY_FILTERS);
    setSort('relevance');
    setPage(1);
  }

  function updateArray(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: toggle(f[key], value) }));
  }
  function updateText(key, value) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function applySaved(saved) {
    setFilters(filtersFromSaved(saved));
    setQ(typeof saved.q === 'string' ? saved.q : '');
    setSort(SORT_OPTIONS.some((o) => o.value === saved.sort) ? saved.sort : 'relevance');
    setPage(1);
  }

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
          contact.phone = result.phone ?? contact.phone;
          contact.revealed = true;
        }
      }),
    );
  }

  const results = data?.results ?? [];
  const pageIds = results.map((c) => c.id);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectedUnrevealed = results.filter((c) => selected.has(c.id) && !c.revealed);
  const bulkRevealCost = (costs?.REVEAL ?? 0) * selectedUnrevealed.length;

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

  async function bulkReveal() {
    if (!revealArmed) {
      setRevealArmed(true);
      return;
    }
    setBulkRevealing(true);
    let ok = 0;
    let failed = 0;
    // Sequential on purpose: each reveal reserves credits, and a burst of
    // parallel reveals against a nearly-empty balance would race.
    for (const contact of selectedUnrevealed) {
      try {
        await handleReveal(contact.id);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkRevealing(false);
    setRevealArmed(false);
    setSelected(new Set());
    if (failed === 0) toast.success(`Revealed ${ok} email${ok === 1 ? '' : 's'}`);
    else
      toast.warning(
        `Revealed ${ok} of ${ok + failed}`,
        failed === ok + failed ? 'Check your credit balance.' : 'Some reveals failed — check your credit balance.',
      );
  }

  const facets = data?.facets ?? {};
  const railGroups = [
    {
      key: 'title',
      label: 'Job title',
      icon: Briefcase,
      type: 'text',
      hint: 'Include titles containing',
      placeholder: 'e.g. Finance manager',
      value: filters.title,
      onChange: (v) => updateText('title', v),
    },
    {
      key: 'company',
      label: 'Company',
      icon: Building2,
      type: 'text',
      hint: 'Company name contains',
      placeholder: 'e.g. Acme',
      value: filters.company,
      onChange: (v) => updateText('company', v),
    },
    {
      key: 'seniority',
      label: 'Seniority',
      icon: Award,
      type: 'checkbox',
      options: facets.seniority ?? [],
      selected: filters.seniority,
      onToggle: (v) => updateArray('seniority', v),
    },
    {
      key: 'department',
      label: 'Department',
      icon: Layers,
      type: 'checkbox',
      options: facets.department ?? [],
      selected: filters.department,
      onToggle: (v) => updateArray('department', v),
    },
    {
      key: 'emailStatus',
      label: 'Email status',
      icon: Mail,
      type: 'checkbox',
      options: (facets.emailStatus ?? []).map((o) => ({ ...o, label: EMAIL_STATUS_LABELS[o.value] })),
      selected: filters.emailStatus,
      onToggle: (v) => updateArray('emailStatus', v),
    },
    {
      key: 'industry',
      label: 'Company industry',
      icon: Factory,
      type: 'checkbox',
      options: facets.industry ?? [],
      selected: filters.industry,
      onToggle: (v) => updateArray('industry', v),
    },
    {
      key: 'location',
      label: 'Company location',
      icon: MapPin,
      type: 'checkbox',
      options: facets.location ?? [],
      selected: filters.location,
      onToggle: (v) => updateArray('location', v),
    },
  ];

  const exportPath = `/search/people/export?${toQueryString({ ...queryArgs, page: undefined, pageSize: undefined })}`;
  const currentFilters = {
    ...(q ? { q } : {}),
    ...Object.fromEntries(
      Object.entries(filters).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v))),
    ),
    ...(sort !== 'relevance' ? { sort } : {}),
  };
  const columnCount = visibleColumns.length + 2; // + checkbox + actions

  return (
    <div>
      <PageHeader
        title="Find people"
        subtitle={data ? `${data.total.toLocaleString()} ${data.total === 1 ? 'person' : 'people'}` : undefined}
        actions={
          <>
            <SavedSearchesMenu
              type="PEOPLE"
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
              placeholder="Search by name or title…"
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
            <ColumnPicker columns={CONTACT_COLUMNS} visible={visibleColumns} onToggle={toggleColumn} />
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
              <table className="w-full min-w-[1040px]">
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
                    {CONTACT_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((c) => (
                      <th key={c.key} className={`${thClass} ${c.key === 'linkedin' ? '!px-3' : ''}`}>
                        {c.key === 'linkedin' ? <span className="sr-only">LinkedIn</span> : c.label}
                      </th>
                    ))}
                    <th className={thClass}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching && !data && <SkeletonRows rows={8} columns={columnCount} />}
                  {results.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      onReveal={handleReveal}
                      selectable
                      selected={selected.has(contact.id)}
                      onSelectChange={toggleOne}
                      columns={visibleColumns}
                    />
                  ))}
                  {data && results.length === 0 && (
                    <tr>
                      <td colSpan={columnCount}>
                        <EmptyState
                          illustration={hasActiveFilters ? <Illustration.Search /> : <Illustration.People />}
                          title={hasActiveFilters ? 'No people match these filters' : 'No people yet'}
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
        <BulkAddToList type="CONTACTS" ids={[...selected]} onDone={() => setSelected(new Set())} />
        {selectedUnrevealed.length > 0 && (
          <Button
            variant={revealArmed ? 'hero' : 'primary'}
            size="sm"
            icon={Mail}
            loading={bulkRevealing}
            onClick={bulkReveal}
          >
            {revealArmed
              ? `Confirm · ${bulkRevealCost} cr`
              : `Reveal ${selectedUnrevealed.length} · ${bulkRevealCost} cr`}
          </Button>
        )}
      </BulkActionBar>
    </div>
  );
}
