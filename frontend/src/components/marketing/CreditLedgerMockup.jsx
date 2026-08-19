const ENTRIES = [
  { label: 'Monthly grant', delta: '+100', tone: 'text-emerald-400' },
  { label: 'Reveal · Avery Bennett', delta: '−1', tone: 'text-ink-300' },
  { label: 'Reveal · Casey Ortiz', delta: '−1', tone: 'text-ink-300' },
  { label: 'Reveal · Jordan Price', delta: '−1', tone: 'text-ink-300' },
];

export function CreditLedgerMockup({ className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
          app.datapit.io/billing
        </span>
      </div>
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-300">Balance</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">97 credits</p>

        <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4">
          {ENTRIES.map((e) => (
            <div key={e.label} className="flex items-center justify-between text-xs">
              <span className="text-ink-300">{e.label}</span>
              <span className={`font-bold tabular-nums ${e.tone}`}>{e.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
