import { cn } from './cn.js';

// Neutral segmented toggle (billing interval, currency, ticket type). The
// active segment is a raised elevated surface, not the accent — keeps the
// one-accent-per-screen rule intact.
export function SegmentedControl({ options, value, onChange, size = 'sm', className, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-sm font-semibold transition-colors',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-sm',
              active
                ? 'bg-surface-elevated text-text shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {opt.label}
            {opt.hint && <span className="ml-1 font-medium opacity-70">{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
