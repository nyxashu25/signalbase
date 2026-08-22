import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  LayoutDashboard,
  Users,
  Building2,
  ListChecks,
  Send,
  CreditCard,
  LifeBuoy,
  UserCircle,
  BookOpen,
  Plus,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { useSearchPeopleQuery, useSearchCompaniesQuery } from '../../api/searchApi.js';
import { useListListsQuery } from '../../api/listsApi.js';
import { useListSequencesQuery } from '../../api/sequencesApi.js';
import { LetterAvatar } from '../ui/LetterAvatar.jsx';

const PAGES = [
  { label: 'Home', to: '/app', icon: LayoutDashboard, keywords: 'dashboard overview getting started' },
  { label: 'People', to: '/app/people', icon: Users, keywords: 'contacts search find' },
  { label: 'Companies', to: '/app/companies', icon: Building2, keywords: 'accounts search' },
  { label: 'Lists', to: '/app/lists', icon: ListChecks, keywords: 'saved' },
  { label: 'Sequences', to: '/app/sequences', icon: Send, keywords: 'outreach campaigns email' },
  { label: 'Billing', to: '/app/billing', icon: CreditCard, keywords: 'plan credits invoices' },
  { label: 'Tickets', to: '/app/tickets', icon: LifeBuoy, keywords: 'support help' },
  { label: 'Profile', to: '/app/profile', icon: UserCircle, keywords: 'account settings' },
  { label: 'Help', to: '/app/help', icon: BookOpen, keywords: 'docs guide how credits work faq' },
];

const ACTIONS = [
  { label: 'New list', to: '/app/lists?new=1', icon: Plus, keywords: 'create' },
  { label: 'New sequence', to: '/app/sequences/new', icon: Plus, keywords: 'create outreach' },
  { label: 'New ticket', to: '/app/tickets/new', icon: Plus, keywords: 'support help raise' },
  { label: 'Add credits', to: '/app/billing/add-credits', icon: Coins, keywords: 'buy top up' },
];

function useDebounced(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const PALETTE_SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

/**
 * ⌘K / Ctrl+K palette: jump to any page, run a quick action, or search
 * people / companies / lists / sequences by name. Record search only kicks
 * in after two characters (debounced) so an idle-open palette never hits
 * Elasticsearch. Keyboard-first — arrows, enter, escape — via cmdk.
 */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 200);
  const searching = debounced.length >= 2;

  const { data: people } = useSearchPeopleQuery(
    { q: debounced, page: 1, pageSize: 5 },
    { skip: !open || !searching },
  );
  const { data: companies } = useSearchCompaniesQuery(
    { q: debounced, page: 1, pageSize: 5 },
    { skip: !open || !searching },
  );
  const { data: lists } = useListListsQuery(undefined, { skip: !open });
  const { data: sequences } = useListSequencesQuery(undefined, { skip: !open });

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  function go(to) {
    onOpenChange(false);
    navigate(to);
  }

  const listItems = useMemo(() => (lists ?? []).slice(0, 50), [lists]);
  const sequenceItems = useMemo(() => (sequences ?? []).slice(0, 50), [sequences]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      shouldFilter
      overlayClassName="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]"
      contentClassName="dp-pop-in fixed left-1/2 top-[12vh] z-[71] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-dp-md"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search people, companies, lists… or jump to a page"
          className="h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted/70"
        />
        <kbd className="hidden rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-semibold text-text-muted sm:inline">
          esc
        </kbd>
      </div>
      <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-text-muted">
        <Command.Empty className="px-3 py-8 text-center text-sm text-text-muted">
          {searching ? 'No matches.' : 'Type to search, or pick a page below.'}
        </Command.Empty>

        {searching && people?.results?.length > 0 && (
          <Command.Group heading="People">
            {people.results.map((c) => (
              <Item
                key={c.id}
                value={`person ${c.firstName} ${c.lastName} ${c.company?.name ?? ''}`}
                onSelect={() => go('/app/people')}
              >
                <LetterAvatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                <span className="min-w-0 flex-1 truncate">
                  {c.firstName} {c.lastName}
                  {c.title && <span className="text-text-muted"> · {c.title}</span>}
                </span>
                {c.company?.name && (
                  <span className="truncate text-xs text-text-muted">{c.company.name}</span>
                )}
              </Item>
            ))}
          </Command.Group>
        )}

        {searching && companies?.results?.length > 0 && (
          <Command.Group heading="Companies">
            {companies.results.map((co) => (
              <Item
                key={co.id}
                value={`company ${co.name} ${co.domain ?? ''}`}
                onSelect={() => go(`/app/companies/${co.id}`)}
              >
                <LetterAvatar name={co.name} size="sm" square />
                <span className="min-w-0 flex-1 truncate">{co.name}</span>
                {co.domain && <span className="truncate text-xs text-text-muted">{co.domain}</span>}
              </Item>
            ))}
          </Command.Group>
        )}

        {listItems.length > 0 && (
          <Command.Group heading="Lists">
            {listItems.map((l) => (
              <Item key={l.id} value={`list ${l.name}`} onSelect={() => go(`/app/lists/${l.id}`)}>
                <ListChecks className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                <span className="text-xs text-text-muted">
                  {l._count?.items ?? 0} {l.type === 'CONTACTS' ? 'contacts' : 'companies'}
                </span>
              </Item>
            ))}
          </Command.Group>
        )}

        {sequenceItems.length > 0 && (
          <Command.Group heading="Sequences">
            {sequenceItems.map((s) => (
              <Item
                key={s.id}
                value={`sequence ${s.name}`}
                onSelect={() => go(`/app/sequences/${s.id}`)}
              >
                <Send className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="text-xs text-text-muted">{s.status}</span>
              </Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Go to">
          {PAGES.map((p) => (
            <Item key={p.to} value={`page ${p.label} ${p.keywords}`} onSelect={() => go(p.to)}>
              <p.icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <span className="flex-1">{p.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-text-muted/60" aria-hidden="true" />
            </Item>
          ))}
        </Command.Group>

        <Command.Group heading="Actions">
          {ACTIONS.map((a) => (
            <Item key={a.to} value={`action ${a.label} ${a.keywords}`} onSelect={() => go(a.to)}>
              <a.icon className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <span className="flex-1">{a.label}</span>
            </Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function Item({ children, ...rest }) {
  return (
    <Command.Item
      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-text data-[selected=true]:bg-surface-hover"
      {...rest}
    >
      {children}
    </Command.Item>
  );
}

// The header trigger — a fake input that opens the palette, mirroring the
// centered "Search or ask… ⌘K" affordance in the benchmark.
export function CommandPaletteTrigger({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-text-muted/40 hover:bg-surface-hover ${className}`}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate text-left">Search or jump to…</span>
      <kbd className="hidden shrink-0 rounded-sm border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold text-text-muted sm:inline">
        {PALETTE_SHORTCUT_LABEL}
      </kbd>
    </button>
  );
}
