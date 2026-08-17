// groups: [{ key, label, options: [{value, count}], selected: string[], onToggle(value) }]
export function FacetPanel({ groups }) {
  return (
    <div className="w-56 shrink-0 space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {group.label}
          </h3>
          <div className="mt-2 flex flex-col gap-1.5">
            {group.options.length === 0 && <p className="text-xs text-slate-400">No options yet</p>}
            {group.options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center justify-between gap-2 text-sm text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={group.selected.includes(opt.value)}
                    onChange={() => group.onToggle(opt.value)}
                    className="rounded border-slate-300"
                  />
                  {opt.value}
                </span>
                <span className="text-xs tabular-nums text-slate-400">{opt.count}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
