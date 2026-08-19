import { useEffect, useRef, useState } from 'react';

const STEPS = [
  { name: 'idle', ms: 1000 },
  { name: 'move', ms: 700 },
  { name: 'click', ms: 450 },
  { name: 'revealed', ms: 2400 },
  { name: 'reset', ms: 600 },
];

export function AnimatedRevealMockup({ className = '' }) {
  const [stepIndex, setStepIndex] = useState(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion.current) {
      setStepIndex(3); // revealed
      return;
    }
    let timer;
    let i = 0;
    const step = () => {
      setStepIndex(i);
      timer = setTimeout(() => {
        i = (i + 1) % STEPS.length;
        step();
      }, STEPS[i].ms);
    };
    step();
    return () => clearTimeout(timer);
  }, []);

  const name = STEPS[stepIndex].name;
  const revealed = name === 'revealed';
  const clicking = name === 'click';
  const cursorVisible = name !== 'idle' && name !== 'reset';
  const cursorTop = clicking || revealed ? '78%' : '55%';

  return (
    <div className={`[perspective:1400px] ${className}`}>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-dp-md animate-[ambient-tilt_10s_ease-in-out_infinite]">
        <div className="flex items-center gap-2 border-b border-white/10 bg-ink-950 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 rounded-md bg-white/5 px-3 py-1 text-[11px] text-ink-300">
            app.datapit.io/people
          </span>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-action text-sm font-bold text-white">
              JP
            </div>
            <div>
              <p className="text-sm font-bold text-white">Jordan Price</p>
              <p className="text-xs text-ink-300">
                Director of Revenue Operations &middot; Beacon Labs
              </p>
            </div>
          </div>

          <div className="relative mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-300">Email</p>
            {revealed ? (
              <p className="mt-1 font-mono text-sm text-white">jordan.price@beaconlabs.com</p>
            ) : (
              <p className="mt-1 font-mono text-sm text-ink-700 blur-[3px] select-none">
                jordan.price@beaconlabs.com
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              {revealed ? (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                  Verified
                </span>
              ) : (
                <span
                  className={`relative rounded-md border border-white/15 px-2.5 py-1 text-[10px] font-bold text-mauve-magic transition-transform ${
                    clicking ? 'scale-90' : 'scale-100'
                  }`}
                >
                  Reveal
                  {clicking && (
                    <>
                      <span className="absolute -inset-2 animate-ping rounded-full bg-white/30" />
                      <ParticleBurst />
                    </>
                  )}
                </span>
              )}
              <span className="text-[11px] font-bold text-mauve-magic">&minus;1 credit</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-ink-500">
            {revealed
              ? 'Revealed by you · now visible to your whole workspace'
              : 'Masked until revealed'}
          </p>
        </div>

        {/* Cursor */}
        <div
          className="pointer-events-none absolute z-10 transition-all duration-700 ease-out"
          style={{
            left: '58%',
            top: cursorTop,
            opacity: cursorVisible ? 1 : 0,
            transform: `translate(-4px, -2px) scale(${clicking ? 0.85 : 1})`,
          }}
        >
          <Cursor />
        </div>
      </div>
    </div>
  );
}

const PARTICLE_VECTORS = [
  [16, -12],
  [-14, -14],
  [18, 9],
  [-16, 7],
];

function ParticleBurst() {
  return (
    <>
      {PARTICLE_VECTORS.map(([dx, dy], i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-mauve-magic animate-[particle-burst_600ms_ease-out_forwards]"
          style={{ '--dx': `${dx}px`, '--dy': `${dy}px` }}
        />
      ))}
    </>
  );
}

function Cursor() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1">
      <path d="M4 2l14 8-6 1.5L14 20l-3-6.5L4 16V2z" />
    </svg>
  );
}
