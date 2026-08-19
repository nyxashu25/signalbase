import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { label: 'Intro email', detail: 'Sent · 68% open rate' },
  { label: 'Wait 3 days', detail: null },
  { label: 'Follow-up', detail: 'Scheduled' },
];

const ACTIVE_MS = 1400;
const IDLE_MS = 900;

export function AnimatedSequenceMockup({ className = '' }) {
  const [active, setActive] = useState(-1);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) {
      setActive(STEPS.length - 1);
      return;
    }
    let timer;
    let i = -1;
    const step = () => {
      setActive(i);
      const ms = i === -1 ? IDLE_MS : ACTIVE_MS;
      timer = setTimeout(() => {
        i = i + 1 >= STEPS.length ? -1 : i + 1;
        step();
      }, ms);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md animate-[ambient-tilt_10s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
            app.datapit.io/sequences
          </span>
        </div>
        <div className="p-5">
          <p className="text-xs font-bold text-white">Q3 outbound &mdash; Marketing leaders</p>
          <p className="mt-0.5 text-[11px] text-ink-300">41 enrolled &middot; Active</p>

          <div className="mt-5 flex flex-col">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              const isDone = active > i || active === -1;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                        isActive
                          ? 'scale-125 bg-gradient-action text-white shadow-[0_0_14px_rgba(197,82,255,0.7)]'
                          : isDone
                            ? 'bg-gradient-action text-white'
                            : 'bg-white/10 text-ink-300'
                      }`}
                    >
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && <span className="my-1 h-8 w-px bg-white/10" />}
                  </div>
                  <div className="pb-6">
                    <p
                      className={`text-xs font-semibold transition-colors ${isActive ? 'text-mauve-magic' : 'text-white'}`}
                    >
                      {step.label}
                    </p>
                    {step.detail && <p className="text-[11px] text-ink-300">{step.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
