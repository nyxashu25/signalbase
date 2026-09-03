import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, X, SlidersHorizontal, Lock } from 'lucide-react';
import { cn } from '../ui/cn.js';
import { CountPill } from '../ui/StatusPill.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { Tooltip } from '../ui/Tooltip.jsx';

const INITIAL_VISIBLE_OPTIONS = 8;

/**
 * The left filter rail for People / Companies (docs/UX-ROADMAP.md §2.1).
 *
 * groups: [{
 *   key, label, icon,
 *   type: 'checkbox' | 'text' | 'locked',
 *   // checkbox: options [{ value, count, label? }], selected: string[], onToggle(value)
 *   // text:     value: string, onChange(value), placeholder
 *   // locked:   hint (tooltip copy) — a non-interactive row for a filter
 *   //           category DataPit doesn't have data for yet. Renders greyed
 *   //           out with a lock icon and a "Coming soon" pill instead of an
 *   //           expand chevron; never implies a paid plan unlocks it.
 * }]
 *
 * Every group is an accordion row — icon · label · active-count pill (click
 * = clear that group) · chevron — with its applied values shown as removable
 * chips when expanded. Groups with an active selection open by default.
 */
export function FilterRail({ groups, total, isFetching = false, className }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = groups.reduce((sum, g) => sum + activeCountOf(g), 0);

  function clearAll() {
    groups.forEach(clearGroup);
  }

  return (
    <div className={cn('w-full shrink-0 md:w-[272px]', className)}>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 text-sm font-semibold text-text md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters
        </span>
        {activeCount > 0 && <CountPill tone="accent">{activeCount}</CountPill>}
      </button>

      <div
        className={cn(
          'flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated md:flex',
          mobileOpen ? 'mt-3 flex' : 'hidden',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-text">
            <SlidersHorizontal className="h-4 w-4 text-text-muted" aria-hidden="true" />
            Filters
            {activeCount > 0 && <CountPill tone="accent">{activeCount}</CountPill>}
          </div>
          <span className="text-xs text-text-muted">
            {isFetching && total === undefined ? (
              <Skeleton className="h-3.5 w-16" />
            ) : total !== undefined ? (
              <>
                <span className="font-semibold tabular-nums text-text">{total.toLocaleString()}</span>{' '}
                total
              </>
            ) : null}
          </span>
        </div>

        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
          {groups.map((group) => (
            <FilterGroup key={group.key} group={group} />
          ))}
        </div>

        {activeCount > 0 && (
          <div className="border-t border-border px-3.5 py-2.5">
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Clear all {activeCount}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function activeCountOf(group) {
  if (group.type === 'locked') return 0;
  if (group.type === 'text') return group.value ? 1 : 0;
  return group.selected.length;
}

function clearGroup(group) {
  if (group.type === 'locked') return;
  if (group.type === 'text') {
    if (group.value) group.onChange('');
    return;
  }
  [...group.selected].forEach((v) => group.onToggle(v));
}

function FilterGroup({ group }) {
  if (group.type === 'locked') return <LockedFilterRow group={group} />;

  const active = activeCountOf(group);
  const [open, setOpen] = useState(active > 0);
  const Icon = group.icon;

  // A group that gains a selection from outside (a saved search being
  // applied, a chip elsewhere) should reveal itself.
  useEffect(() => {
    if (active > 0) setOpen(true);
  }, [active]);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${open ? 'Collapse' : 'Expand'} ${group.label} filter`}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-surface-hover"
      >
        <span
          aria-hidden="true"
          className={cn('h-1.5 w-1.5 shrink-0 rounded-full', active > 0 ? 'bg-primary' : 'bg-transparent')}
        />
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />}
        <span className="flex-1 truncate text-sm font-semibold text-text">{group.label}</span>
        {active > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${group.label} filter`}
            onClick={(e) => {
              e.stopPropagation();
              clearGroup(group);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                clearGroup(group);
              }
            }}
            className="flex h-5 items-center gap-1 rounded-full border border-border bg-surface-sunken px-1.5 text-[11px] font-bold tabular-nums text-text-muted hover:border-red-500/40 hover:text-red-600"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {active}
          </span>
        )}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3 pt-0.5">
          {group.type === 'text' ? <TextFilter group={group} /> : <CheckboxFilter group={group} />}
        </div>
      )}
    </div>
  );
}

// A category DataPit doesn't have data for yet — same row rhythm as a real
// group (icon · label) but greyed, non-expandable, and a "Coming soon" pill
// instead of a chevron. The tooltip is the honest version of the same idea:
// it never claims a plan upgrade would unlock this today.
function LockedFilterRow({ group }) {
  const Icon = group.icon;
  return (
    <Tooltip content={group.hint ?? `${group.label} isn't available yet — it's on our roadmap.`}>
      <div className="flex w-full cursor-default items-center gap-2 border-b border-border px-3.5 py-2.5 text-left last:border-0">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-muted/50" aria-hidden="true" />}
        <span className="flex-1 truncate text-sm font-semibold text-text-muted/70">{group.label}</span>
        <span className="flex items-center gap-1 rounded-full border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">
          <Lock className="h-2.5 w-2.5" aria-hidden="true" />
          Soon
        </span>
      </div>
    </Tooltip>
  );
}

function TextFilter({ group }) {
  const [draft, setDraft] = useState(group.value ?? '');

  useEffect(() => {
    setDraft(group.value ?? '');
  }, [group.value]);

  // Committed on Enter/blur rather than per keystroke so typing a title
  // doesn't fire an ES query per character.
  function commit() {
    const next = draft.trim();
    if (next !== (group.value ?? '')) group.onChange(next);
  }

  return (
    <div>
      {group.hint && <p className="mb-1.5 text-[11px] font-semibold text-text-muted">{group.hint}</p>}
      {group.value ? (
        <Chip label={group.value} onRemove={() => group.onChange('')} />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={group.placeholder}
          aria-label={group.label}
          className="h-8 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-muted/70 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
        />
      )}
    </div>
  );
}

function CheckboxFilter({ group }) {
  const [showAll, setShowAll] = useState(false);
  const labelOf = (opt) => opt.label ?? opt.value;

  const { selectedOptions, visible, hiddenCount } = useMemo(() => {
    const selectedSet = new Set(group.selected);
    const selectedOptions = group.selected.map((value) => ({
      value,
      label: group.options.find((o) => o.value === value)?.label ?? value,
    }));
    // Selected options stay pinned to the top; the rest are shown in the
    // order the API returned them (count-desc for facets, declared order
    // for buckets), trimmed behind "Show more".
    const rest = group.options.filter((o) => !selectedSet.has(o.value));
    const visibleRest = showAll ? rest : rest.slice(0, INITIAL_VISIBLE_OPTIONS);
    return {
      selectedOptions,
      visible: visibleRest,
      hiddenCount: rest.length - visibleRest.length,
    };
  }, [group.options, group.selected, showAll]);

  return (
    <div>
      {group.hint && <p className="mb-1.5 text-[11px] font-semibold text-text-muted">{group.hint}</p>}
      {selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <Chip key={opt.value} label={opt.label} onRemove={() => group.onToggle(opt.value)} />
          ))}
        </div>
      )}
      {group.options.length === 0 && selectedOptions.length === 0 && (
        <p className="text-xs text-text-muted">No options for the current results</p>
      )}
      <div className="flex flex-col gap-0.5">
        {visible.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-sm px-1 py-1 text-sm text-text hover:bg-surface-hover"
          >
            <span className="flex min-w-0 items-center gap-2">
              <input
                type="checkbox"
                checked={group.selected.includes(opt.value)}
                onChange={() => group.onToggle(opt.value)}
                className="h-4 w-4 shrink-0 rounded-sm border-border"
              />
              <span className="truncate">{labelOf(opt)}</span>
            </span>
            {opt.count !== undefined && (
              <span className="shrink-0 text-xs tabular-nums text-text-muted">
                {opt.count.toLocaleString()}
              </span>
            )}
          </label>
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Show {hiddenCount} more
        </button>
      )}
      {showAll && group.options.length > INITIAL_VISIBLE_OPTIONS && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-1.5 text-xs font-semibold text-text-muted hover:underline"
        >
          Show less
        </button>
      )}
    </div>
  );
}

export function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-primary/20"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}
