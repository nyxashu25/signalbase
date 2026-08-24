import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn.js';

/**
 * Centered dialog: backdrop, Escape to close, click-outside to close.
 * Not a portal (none of this app's overlays are — Tooltip/CommandPalette/
 * toast all render in place and rely on z-index), so mount it near the top
 * of whatever tree needs it.
 */
export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'dp-pop-in z-[71] w-full max-w-md rounded-lg border border-border bg-surface-elevated shadow-dp-md',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-sm p-1 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
