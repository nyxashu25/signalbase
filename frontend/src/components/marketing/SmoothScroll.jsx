import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertial smooth scrolling for the marketing pages, driven by Lenis and
 * fed into GSAP's ticker so every ScrollTrigger (pins, scrubs, parallax)
 * reads the smoothed position instead of fighting the native one. Renders
 * nothing; mount it once per page that wants the effect.
 *
 * Skipped entirely under prefers-reduced-motion and on touch-primary
 * devices, where hijacking native scroll momentum feels worse than the
 * default — same fallback split as ScrollSteps.jsx.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    if (reduceMotion || coarsePointer) return;

    let lenis;
    try {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    } catch {
      // jsdom (tests) lacks the layout APIs Lenis needs — page falls back
      // to native scrolling, which is also the no-JS behavior.
      return;
    }

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
}
