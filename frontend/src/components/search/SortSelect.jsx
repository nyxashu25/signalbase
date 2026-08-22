import { ArrowUpDown, ChevronDown } from 'lucide-react';

// A native <select> dressed as the toolbar's "Sort ▾" control — native so
// it's keyboard/screen-reader correct for free and works on mobile.
export function SortSelect({ value, onChange, options, label = 'Sort' }) {
  return (
    <label className="relative inline-flex h-9 items-center rounded-md border border-border bg-surface-elevated pl-2.5 pr-8 text-sm font-semibold text-text hover:border-text-muted/40 focus-within:border-focus focus-within:ring-2 focus-within:ring-focus/25">
      <ArrowUpDown className="mr-1.5 h-4 w-4 text-text-muted" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none bg-transparent pr-1 text-sm font-semibold text-text outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 h-4 w-4 text-text-muted"
        aria-hidden="true"
      />
    </label>
  );
}
