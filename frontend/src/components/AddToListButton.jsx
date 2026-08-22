import { useEffect, useRef, useState } from 'react';
import { Plus, Check, ListChecks } from 'lucide-react';
import {
  useListListsQuery,
  useCreateListMutation,
  useAddListItemMutation,
} from '../api/listsApi.js';
import { Button } from './ui/Button.jsx';
import { cn } from './ui/cn.js';

// type: 'CONTACTS' | 'COMPANIES' — which lists this button offers, and
// which id field it sends when adding.
export function AddToListButton({ type, contactId, companyId, size = 'sm', label = 'Add to list' }) {
  const [open, setOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addedTo, setAddedTo] = useState(null);
  const rootRef = useRef(null);

  const { data: lists } = useListListsQuery(undefined, { skip: !open });
  const [createList, { isLoading: creating }] = useCreateListMutation();
  const [addListItem, { isLoading: adding }] = useAddListItemMutation();

  useEffect(() => {
    if (!open) return undefined;
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

  const matchingLists = (lists ?? []).filter((l) => l.type === type);

  async function handleAdd(listId) {
    await addListItem({ listId, contactId, companyId }).unwrap();
    setAddedTo(listId);
  }

  async function handleCreateAndAdd(e) {
    e.preventDefault();
    if (!newListName.trim()) return;
    const result = await createList({ name: newListName.trim(), type }).unwrap();
    await addListItem({ listId: result.list.id, contactId, companyId }).unwrap();
    setAddedTo(result.list.id);
    setNewListName('');
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant={addedTo ? 'ghost' : 'secondary'}
        size={size}
        icon={addedTo ? Check : Plus}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(addedTo && 'text-emerald-600 dark:text-emerald-400')}
      >
        {addedTo ? 'Saved' : label}
      </Button>

      {open && (
        <div className="dp-pop-in absolute right-0 top-full z-20 mt-1 w-60 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Add to list
          </p>
          <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto">
            {matchingLists.length === 0 && (
              <p className="px-2 py-2 text-xs text-text-muted">No lists yet</p>
            )}
            {matchingLists.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={adding}
                onClick={() => handleAdd(l.id)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-text hover:bg-surface-hover disabled:opacity-50"
              >
                <ListChecks className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="flex-1 truncate">{l.name}</span>
                {addedTo === l.id && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Added</span>
                )}
              </button>
            ))}
          </div>
          <form
            onSubmit={handleCreateAndAdd}
            className="mt-1.5 flex gap-1.5 border-t border-border pt-2"
          >
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2 text-xs text-text outline-none focus:border-focus focus:ring-2 focus:ring-focus/25"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creating}
              disabled={!newListName.trim()}
            >
              Add
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
