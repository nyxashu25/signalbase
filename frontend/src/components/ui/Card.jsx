import { cn } from './cn.js';

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface-elevated', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

// Bordered, elevated container for a <table> — the one place every data
// table in the app gets its rounded frame, sticky header, and horizontal
// scroll from.
export function TableFrame({ className, children }) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface-elevated', className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export const thClass =
  'sticky top-0 z-[1] whitespace-nowrap bg-surface-elevated px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-text-muted';
export const tdClass = 'px-4 py-3 text-sm text-text';
export const tdMutedClass = 'px-4 py-3 text-sm text-text-muted';
export const trClass = 'border-b border-border last:border-0 hover:bg-surface-hover';
