import { useEffect, useRef, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

// "Columns" popover — toggles optional table columns. `columns` is
// [{ key, label, locked }]; locked ones are always on and just shown for
// completeness. The page owns persistence (see useVisibleColumns).
export function ColumnPicker({ columns, visible, onToggle }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="secondary"
        icon={Columns3}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Columns
      </Button>
      {open && (
        <div className="dp-pop-in absolute right-0 top-full z-30 mt-1 w-52 rounded-lg border border-border bg-surface-elevated p-1.5 shadow-dp-md">
          <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            Show columns
          </p>
          {columns.map((col) => (
            <label
              key={col.key}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm ${
                col.locked ? 'text-text-muted' : 'cursor-pointer text-text hover:bg-surface-hover'
              }`}
            >
              <input
                type="checkbox"
                checked={col.locked || visible.includes(col.key)}
                disabled={col.locked}
                onChange={() => onToggle(col.key)}
                className="h-4 w-4 rounded-sm border-border"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function useVisibleColumns(storageKey, defaults) {
  const [visible, setVisible] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : defaults;
    } catch {
      return defaults;
    }
  });
  function toggle(key) {
    setVisible((list) => {
      const next = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // storage unavailable — in-memory is fine
      }
      return next;
    });
  }
  return [visible, toggle];
}
