import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2, Check } from 'lucide-react';
import {
  useListSavedSearchesQuery,
  useCreateSavedSearchMutation,
  useDeleteSavedSearchMutation,
} from '../../api/searchApi.js';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/toast.jsx';

/**
 * "Saved searches ▾" — lists the workspace's saved filter sets for this
 * screen, applies one on click, and saves the current one by name.
 * `type` is 'PEOPLE' | 'COMPANIES'; `currentFilters` is whatever the page
 * would put on the query string (stored verbatim, replayed via onApply).
 */
export function SavedSearchesMenu({ type, currentFilters, hasActiveFilters, onApply }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const rootRef = useRef(null);
  const toast = useToast();

  const { data: saved } = useListSavedSearchesQuery(type, { skip: !open });
  const [createSavedSearch, { isLoading: creating }] = useCreateSavedSearchMutation();
  const [deleteSavedSearch] = useDeleteSavedSearchMutation();

  useEffect(() => {
    if (!open) {
      setSaving(false);
      return undefined;
    }
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createSavedSearch({ type, name: name.trim(), filters: currentFilters }).unwrap();
      toast.success('Search saved', `"${name.trim()}" is in your saved searches.`);
      setName('');
      setSaving(false);
    } catch (err) {
      toast.error('Could not save search', err.data?.error?.message);
    }
  }

  async function handleDelete(s) {
    try {
      await deleteSavedSearch(s.id).unwrap();
    } catch (err) {
      toast.error('Could not delete saved search', err.data?.error?.message);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        icon={Bookmark}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Saved searches
      </Button>

      {open && (
        <div className="dp-pop-in absolute right-0 top-full z-30 mt-1 w-72 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Saved searches
          </p>
          <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
            {saved && saved.length === 0 && (
              <p className="px-2 py-3 text-xs text-text-muted">
                Nothing saved yet. Set some filters, then save them here to come back to in one click.
              </p>
            )}
            {saved?.map((s) => (
              <div
                key={s.id}
                className="group flex items-center gap-1 rounded-sm pl-2 pr-1 hover:bg-surface-hover"
              >
                <button
                  type="button"
                  onClick={() => {
                    onApply(s.filters);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm text-text"
                >
                  <Bookmark className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  <span className="truncate">{s.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="xs"
                  iconOnly
                  icon={Trash2}
                  aria-label={`Delete saved search ${s.name}`}
                  onClick={() => handleDelete(s)}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 border-t border-border pt-1.5">
            {saving ? (
              <form onSubmit={handleSave} className="flex gap-1.5 p-1">
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name this search"
                  aria-label="Saved search name"
                  className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2 text-xs text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
                />
                <Button type="submit" variant="primary" size="sm" icon={Check} loading={creating} disabled={!name.trim()}>
                  Save
                </Button>
              </form>
            ) : (
              <button
                type="button"
                disabled={!hasActiveFilters}
                onClick={() => setSaving(true)}
                title={hasActiveFilters ? undefined : 'Set at least one filter first'}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm font-semibold text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                Save current search
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
