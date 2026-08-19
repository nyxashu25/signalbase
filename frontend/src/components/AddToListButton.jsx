import { useEffect, useRef, useState } from 'react';
import {
  useListListsQuery,
  useCreateListMutation,
  useAddListItemMutation,
} from '../api/listsApi.js';

// type: 'CONTACTS' | 'COMPANIES' — which lists this button offers, and
// which id field it sends when adding.
export function AddToListButton({ type, contactId, companyId }) {
  const [open, setOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addedTo, setAddedTo] = useState(null);
  const rootRef = useRef(null);

  const { data: lists } = useListListsQuery(undefined, { skip: !open });
  const [createList, { isLoading: creating }] = useCreateListMutation();
  const [addListItem, { isLoading: adding }] = useAddListItemMutation();

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted hover:border-primary/40 hover:text-primary"
      >
        + List
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-56 rounded-lg border border-border bg-surface-elevated p-2 shadow-dp-md">
          <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Add to list
          </p>
          <div className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {matchingLists.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-text-muted">No lists yet</p>
            )}
            {matchingLists.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={adding}
                onClick={() => handleAdd(l.id)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-text hover:bg-surface disabled:opacity-50"
              >
                <span className="truncate">{l.name}</span>
                {addedTo === l.id && <span className="text-xs font-bold text-emerald-600">Added</span>}
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateAndAdd} className="mt-2 flex gap-1.5 border-t border-border pt-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface-elevated px-2 text-xs text-text outline-none focus:border-focus"
            />
            <button
              type="submit"
              disabled={creating || !newListName.trim()}
              className="rounded-md bg-gradient-action px-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
