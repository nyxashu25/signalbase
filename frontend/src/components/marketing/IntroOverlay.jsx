import { useCallback, useEffect, useRef, useState } from 'react';
import { getWorldHandle, useWorldState } from './worldStore.js';
import { smoothScrollStore } from './smoothScrollStore.js';

const STORAGE_KEY = 'dp-intro-seen';
const SAFETY_MS = 7000; // dismiss no matter what, even if the world never readies
const FADE_MS = 600;
const COMPLETE_MS = 260; // let the bar visibly reach 100% before the descent

// Once per page load as well as per session, so a browser that blocks
// sessionStorage still only sees the intro on its first marketing mount.
let playedThisLoad = false;

function hasSeenIntro() {
  if (playedThisLoad) return true;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen() {
  playedThisLoad = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Storage blocked (private mode, policy) — playedThisLoad still holds.
  }
}

/**
 * The first-visit descent. On a reader's first marketing page per browser
 * session — and only when the Signal World is actually running — a
 * full-screen ink overlay holds the DataPit mark, the narration line, and a
 * thin progress bar that eases toward 90% while the engine loads. When the
 * world has drawn its first frame the bar completes, the camera starts its
 * descent into station 0 (world.intro()), and the overlay dissolves over it.
 *
 * Click anywhere or press any key to skip — the page underneath stays in the
 * tab order, so a keypress (Tab included) or focus landing on anything
 * behind the overlay dismisses it rather than letting focus move around
 * unseen. A 7 s safety net dismisses it regardless. Renders nothing where the
 * world never activates (reduced motion, no WebGL2, jsdom).
 */
export function IntroOverlay() {
  const { active, ready } = useWorldState();
  // idle → loading → leaving → done. Mirrored in a ref so the transitions
  // (which fire the descent) run exactly once, outside any state updater.
  const [phase, setPhaseState] = useState('idle');
  const phaseRef = useRef('idle');
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const pctRef = useRef(null);
  const meterRef = useRef(null);
  const progressRef = useRef(0);
  const timersRef = useRef([]);

  const setPhase = useCallback((next) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const later = useCallback((fn, ms) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  const paint = useCallback((p) => {
    progressRef.current = p;
    const pct = Math.round(p * 100);
    if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    if (pctRef.current) pctRef.current.textContent = `${pct}%`;
    meterRef.current?.setAttribute('aria-valuenow', String(pct));
  }, []);

  const leave = useCallback(
    (descend) => {
      if (phaseRef.current !== 'loading') return;
      if (descend) {
        try {
          getWorldHandle()?.intro?.();
        } catch {
          // The descent is decoration; the page is usable without it.
        }
      }
      setPhase('leaving');
      later(() => setPhase('done'), FADE_MS);
    },
    [later, setPhase],
  );

  // Start: the first active world of the session.
  useEffect(() => {
    if (phaseRef.current !== 'idle' || !active) return;
    if (hasSeenIntro()) {
      setPhase('done');
      return;
    }
    markIntroSeen();
    setPhase('loading');
  }, [active, setPhase]);

  // The world gave up (engine failed, context lost) — get out of the way.
  useEffect(() => {
    if (phase === 'loading' && !active) leave(false);
  }, [active, phase, leave]);

  // Loading: ease toward 90%, hold the page still, arm the safety net.
  useEffect(() => {
    if (phase !== 'loading') return undefined;
    let rafId = 0;
    const start = performance.now();
    function tick(now) {
      const p = 0.9 * (1 - Math.exp(-(now - start) / 1500));
      if (p > progressRef.current) paint(p);
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    const lenis = smoothScrollStore.get();
    lenis?.stop();
    const block = (e) => {
      if (e.cancelable) e.preventDefault();
    };
    window.addEventListener('wheel', block, { passive: false });
    window.addEventListener('touchmove', block, { passive: false });
    const onKey = () => leave(false);
    const onFocusIn = (e) => {
      if (!rootRef.current?.contains(e.target)) leave(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);
    const safety = window.setTimeout(() => leave(false), SAFETY_MS);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      lenis?.start();
    };
  }, [phase, paint, leave]);

  // Ready: complete the bar, then descend and dissolve.
  useEffect(() => {
    if (phase !== 'loading' || !ready) return;
    paint(1);
    later(() => leave(true), COMPLETE_MS);
  }, [phase, ready, paint, leave, later]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.length = 0;
    };
  }, []);

  if (phase !== 'loading' && phase !== 'leaving') return null;
  const leaving = phase === 'leaving';

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-ink-950 px-6 text-white transition-opacity ease-brand"
      style={{
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? 'none' : 'auto',
        transitionDuration: `${FADE_MS}ms`,
      }}
      onClick={() => leave(false)}
    >
      <div
        aria-hidden="true"
        className="story-pulse pointer-events-none absolute inset-0 m-auto h-[60vh] w-[60vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,0,186,0.32), transparent 62%)',
          filter: 'blur(40px)',
        }}
      />
      <div className="story-intro-in relative flex flex-col items-center">
        <img src="/logos/datapit-logo-dark.svg" alt="DataPit" className="h-12 sm:h-14" />
        <p className="story-narration mt-6 text-lg text-mauve-2/90">Descending into the pit</p>
        <div className="mt-9 w-56 sm:w-64">
          <div
            ref={meterRef}
            role="progressbar"
            aria-label="Loading the DataPit world"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
            className="relative h-px w-full overflow-hidden bg-white/10"
          >
            <div
              ref={barRef}
              className="absolute inset-0 origin-left bg-gradient-action transition-transform duration-200 ease-brand"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
          <div className="mt-3 flex justify-between text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
            <span>Signal</span>
            <span ref={pctRef} className="tabular-nums">
              0%
            </span>
          </div>
        </div>
      </div>
      <p className="absolute bottom-8 text-[11px] font-bold uppercase tracking-[0.25em] text-ink-500">
        Click or press any key to skip
      </p>
    </div>
  );
}
