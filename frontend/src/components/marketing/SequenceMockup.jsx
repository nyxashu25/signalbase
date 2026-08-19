const STEPS = [
  { type: 'EMAIL', label: 'Intro email', detail: 'Sent · 68% open rate' },
  { type: 'WAIT', label: 'Wait 3 days', detail: null },
  { type: 'EMAIL', label: 'Follow-up', detail: 'Scheduled' },
];

export function SequenceMockup({ className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
          app.datapit.io/sequences
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs font-bold text-white">Q3 outbound — Marketing leaders</p>
        <p className="mt-0.5 text-[11px] text-ink-300">41 enrolled · Active</p>

        <div className="mt-5 flex flex-col">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.type === 'EMAIL'
                      ? 'bg-gradient-action text-white'
                      : 'bg-white/10 text-ink-300'
                  }`}
                >
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && <span className="my-1 h-8 w-px bg-white/10" />}
              </div>
              <div className="pb-6">
                <p className="text-xs font-semibold text-white">{step.label}</p>
                {step.detail && <p className="text-[11px] text-ink-300">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
