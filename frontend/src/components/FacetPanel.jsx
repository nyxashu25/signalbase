import { useState } from 'react';

function FilterIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

// groups: [{ key, label, options: [{value, count}], selected: string[], onToggle(value) }]
export function FacetPanel({ groups }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = groups.reduce((sum, g) => sum + g.selected.length, 0);

  function clearAll() {
    groups.forEach((g) => [...g.selected].forEach((value) => g.onToggle(value)));
  }

  return (
    <div className="w-full shrink-0 md:w-56">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text md:hidden"
      >
        <span className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4" />
          Filters
        </span>
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <div className={`${mobileOpen ? 'mt-4 flex' : 'hidden'} flex-col gap-6 md:mt-0 md:flex`}>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="-mb-2 w-fit text-xs font-bold text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {group.label}
            </h3>
            <div className="mt-2 flex flex-col gap-1.5">
              {group.options.length === 0 && (
                <p className="text-xs text-text-muted">No options yet</p>
              )}
              {group.options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center justify-between gap-2 text-sm text-text"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={group.selected.includes(opt.value)}
                      onChange={() => group.onToggle(opt.value)}
                      className="rounded border-border text-primary focus:ring-focus"
                    />
                    {opt.value}
                  </span>
                  <span className="text-xs tabular-nums text-text-muted">{opt.count}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
