import { Search, X } from 'lucide-react';
import { cn } from './cn.js';

/**
 * The control strip between a PageHeader and its table: left-aligned
 * filter/search controls, right-aligned view/sort/actions. Wraps on narrow
 * screens instead of overflowing.
 */
export function Toolbar({ left, right, className }) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{left}</div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, ...rest }) {
  return (
    <label className={cn('relative block', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 w-full min-w-[200px] rounded-md border border-border bg-surface-elevated pl-8 pr-8 text-sm text-text placeholder:text-text-muted/70 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 [&::-webkit-search-cancel-button]:appearance-none"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange({ target: { value: '' } })}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted hover:text-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </label>
  );
}
