import { useEffect, useRef, useState } from 'react';

const CYCLE_MS = 2600;
const HOLD_MS = 1400;

function useLoopProgress() {
  const [t, setT] = useState(0); // 0 -> 1 -> hold -> reset
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) {
      setT(1);
      return;
    }
    let raf;
    let timeout;
    const runCycle = () => {
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / CYCLE_MS, 1);
        setT(progress);
        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          timeout = setTimeout(() => {
            setT(0);
            raf = requestAnimationFrame(tick);
          }, HOLD_MS);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    runCycle();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, []);

  return t;
}

export function RoleAccent({ type, label, value, suffix = '' }) {
  const t = useLoopProgress();
  const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

  return (
    <div className="mt-5 rounded-lg border border-white/10 bg-ink-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-300">{label}</p>
      <div className="mt-3">
        {type === 'bars' && <BarsViz progress={eased} />}
        {type === 'counter' && <CounterViz progress={eased} target={value} suffix={suffix} />}
        {type === 'ring' && <RingViz progress={eased} target={value} />}
      </div>
    </div>
  );
}

function BarsViz({ progress }) {
  const heights = [0.55, 0.9, 0.7];
  return (
    <div className="flex h-12 items-end gap-2">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-4 rounded-t-sm bg-gradient-action transition-[height] duration-100"
          style={{ height: `${Math.min(progress * 1.15, 1) * h * 100}%` }}
        />
      ))}
    </div>
  );
}

function CounterViz({ progress, target, suffix }) {
  const current = Math.round(progress * target);
  return (
    <p className="text-2xl font-extrabold tabular-nums text-white">
      {current}
      {suffix}
    </p>
  );
}

function RingViz({ progress, target }) {
  const pct = progress * target;
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="flex items-center gap-3">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="url(#role-ring-gradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="role-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9400DE" />
            <stop offset="100%" stopColor="#BE3DFF" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-xl font-extrabold tabular-nums text-white">{Math.round(pct)}%</span>
    </div>
  );
}
