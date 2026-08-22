import { X } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

/**
 * Floating bar that appears once at least one row is checked. `children`
 * are the action buttons (Add to list, Reveal N…) — this only owns the
 * count and the Clear affordance.
 */
export function BulkActionBar({ count, noun = 'selected', onClear, children }) {
  if (!count) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="dp-pop-in fixed bottom-5 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-surface-elevated py-2 pl-3.5 pr-2 shadow-dp-md"
    >
      <span className="whitespace-nowrap text-sm font-semibold text-text">
        <span className="tabular-nums">{count}</span> {noun}
      </span>
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <div className="flex items-center gap-1.5">{children}</div>
      <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Clear selection" onClick={onClear} />
    </div>
  );
}
