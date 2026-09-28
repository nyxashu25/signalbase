import { useEffect, useRef, useState } from 'react';

/**
 * Whether `ref`'s element is on (or within `rootMargin` of) the screen. For
 * the looping product demos in the mockup plates: offscreen they pause
 * instead of re-rendering every few hundred milliseconds where nobody can see
 * them — on a phone that's main-thread time taken from the page the reader
 * is actually looking at.
 *
 * Reads true until the first observation arrives (and always where
 * IntersectionObserver is missing), so a demo starts exactly as it always
 * has and only pauses once it's known to be offscreen.
 */
export function useOnScreen(ref, rootMargin = '160px') {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setOnScreen(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return onScreen;
}

/**
 * Run `setup(el)` once `el` comes within a viewport's height of the screen,
 * and return a cleanup that undoes whichever happened (the pending wait, or
 * `setup`'s own returned cleanup). For the scroll-scrubbed GSAP set-ups of
 * content further down a page (chapter turns, headline scrubs): each one
 * splits text and measures the page, and doing all of them in the first
 * render made it one long task at the very moment the page first turns
 * live. Content already near the screen is set up on the observer's first
 * report, one frame after mount; the rest a screen ahead of the reader.
 * Without IntersectionObserver, `setup` runs at once.
 */
export function whenNear(el, setup) {
  if (typeof IntersectionObserver === 'undefined') {
    const cleanup = setup(el);
    return () => cleanup?.();
  }
  let cleanup = null;
  let done = false;
  const observer = new IntersectionObserver(
    (entries) => {
      if (done || !entries.some((entry) => entry.isIntersecting)) return;
      done = true;
      observer.disconnect();
      cleanup = setup(el);
    },
    { rootMargin: '100% 0px' },
  );
  observer.observe(el);
  return () => {
    done = true;
    observer.disconnect();
    cleanup?.();
  };
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * A scripted demo's current step: index `i` holds for `durations[i]` ms,
 * then the next, looping. Runs only while `ref`'s element is on screen
 * (useOnScreen) and resumes where it paused. Under reduced motion it rests
 * on `reducedStep` and never ticks. `durations` must be a stable array
 * (a module-level constant).
 */
export function useStepLoop(ref, durations, reducedStep) {
  const onScreen = useOnScreen(ref);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.(REDUCED_MOTION).matches) {
      setIndex(reducedStep);
      return undefined;
    }
    if (!onScreen) return undefined;
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        indexRef.current = (indexRef.current + 1) % durations.length;
        setIndex(indexRef.current);
        schedule();
      }, durations[indexRef.current]);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [onScreen, durations, reducedStep]);

  return index;
}
