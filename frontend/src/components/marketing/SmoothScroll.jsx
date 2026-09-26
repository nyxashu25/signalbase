import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { smoothScrollStore } from './smoothScrollStore.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertial smooth scrolling for the marketing pages, driven by Lenis and
 * fed into GSAP's ticker so every ScrollTrigger (pins, scrubs, parallax)
 * reads the smoothed position instead of fighting the native one. Renders
 * nothing; mounted once by MarketingLayout (not per page) so a route change
 * never spins up a second instance mid-transition. The instance is published
 * on smoothScrollStore for the bookmark rail and page-turn scroll reset.
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
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    } catch {
      // jsdom (tests) lacks the layout APIs Lenis needs — page falls back
      // to native scrolling, which is also the no-JS behavior.
      return;
    }

    smoothScrollStore.set(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      smoothScrollStore.set(null);
    };
  }, []);

  return null;
}
