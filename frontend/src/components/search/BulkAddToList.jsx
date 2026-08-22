import { useEffect, useRef, useState } from 'react';
import { ListPlus, ListChecks } from 'lucide-react';
import { useListListsQuery, useAddListItemMutation } from '../../api/listsApi.js';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/toast.jsx';

// Bulk "Add N to list" for the search tables. Adds every selected id to the
// chosen list one request at a time (the list API is single-item) and
// reports a summary toast; duplicates are idempotent on the server so
// re-adding is harmless.
export function BulkAddToList({ type, ids, onDone }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  const toast = useToast();
  const { data: lists } = useListListsQuery(undefined, { skip: !open });
  const [addListItem] = useAddListItemMutation();

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const matching = (lists ?? []).filter((l) => l.type === type);
  const idField = type === 'CONTACTS' ? 'contactId' : 'companyId';

  async function addAll(list) {
    setBusy(true);
    const results = await Promise.allSettled(
      ids.map((id) => addListItem({ listId: list.id, [idField]: id }).unwrap()),
    );
    setBusy(false);
    setOpen(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      toast.success(`Added ${ids.length} to "${list.name}"`, undefined, {
        action: 'Open list',
        actionTo: `/app/lists/${list.id}`,
      });
    } else {
      toast.warning(
        `Added ${ids.length - failed} of ${ids.length} to "${list.name}"`,
        'Some rows could not be added.',
      );
    }
    onDone?.();
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        size="sm"
        icon={ListPlus}
        loading={busy}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Add to list
      </Button>
      {open && (
        <div className="dp-pop-in absolute bottom-full left-0 z-40 mb-2 w-60 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Add {ids.length} to list
          </p>
          <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
            {matching.length === 0 && (
              <p className="px-2 py-2 text-xs text-text-muted">
                No {type === 'CONTACTS' ? 'people' : 'company'} lists yet — create one from Lists.
              </p>
            )}
            {matching.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => addAll(l)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-text hover:bg-surface-hover"
              >
                <ListChecks className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                <span className="flex-1 truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
