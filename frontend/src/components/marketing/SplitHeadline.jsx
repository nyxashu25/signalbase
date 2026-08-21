import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * Splits its text into words and reveals them with a staggered slide-up +
 * tilt on mount — the "editorial hero" move from the reference sites,
 * vs. the block-level fade-up used everywhere else on the marketing site
 * (see components/marketing/motion.jsx). One-shot entrance only, not
 * scroll-tied, so it's safe to use above the fold.
 */
export function SplitHeadline({ as: Tag = 'h1', className, children, delay = 0 }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(el, { type: 'words', wordsClass: 'split-word' });
      gsap.set(split.words, { display: 'inline-block', opacity: 0, y: 44, rotateX: -35, transformOrigin: '50% 100%' });
      gsap.to(split.words, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.045,
        delay,
      });
    }, el);

    return () => ctx.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className} style={{ perspective: 800 }}>
      {children}
    </Tag>
  );
}
