import { useRef } from 'react';
import { useStepLoop } from './onScreen.js';

const ENTRIES = [
  { label: 'Monthly grant', delta: '+100', tone: 'text-emerald-400', balance: 100 },
  { label: 'Reveal · Avery Bennett', delta: '−2', tone: 'text-ink-300', balance: 98 },
  { label: 'Company view · Beacon Labs', delta: '−20', tone: 'text-ink-300', balance: 78 },
  { label: 'Reveal · Jordan Price', delta: '−2', tone: 'text-ink-300', balance: 76 },
];

const STEP_MS = 750;
const HOLD_MS = 1900;
// Loop step k shows the first k + 1 entries; the full ledger holds longer.
const DURATIONS = ENTRIES.map((_, i) => (i === ENTRIES.length - 1 ? HOLD_MS : STEP_MS));

export function AnimatedCreditLedgerMockup({ className = '' }) {
  const rootRef = useRef(null);
  const visibleCount = useStepLoop(rootRef, DURATIONS, ENTRIES.length - 1) + 1;

  const balance = ENTRIES[visibleCount - 1]?.balance ?? ENTRIES[0].balance;

  return (
    <div ref={rootRef} className={`[perspective:1400px] ${className}`}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md animate-[ambient-tilt_10s_ease-in-out_infinite]">
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
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-white transition-all duration-300">
            {balance} credits
          </p>

          <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-4">
            {ENTRIES.map((e, i) => (
              <div
                key={e.label}
                className="flex items-center justify-between text-xs transition-all duration-500"
                style={{
                  opacity: i < visibleCount ? 1 : 0,
                  transform: i < visibleCount ? 'translateY(0)' : 'translateY(6px)',
                }}
              >
                <span className="text-ink-300">{e.label}</span>
                <span className={`font-bold tabular-nums ${e.tone}`}>{e.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
