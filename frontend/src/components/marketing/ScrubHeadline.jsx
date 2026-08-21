import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * The scroll-scrubbed companion to SplitHeadline: words start dim and
 * slightly dropped, and resolve to full opacity one after another as the
 * headline moves through the viewport — tied to scroll position (scrub),
 * not a one-shot entrance, so scrolling back down replays it in reverse.
 * Under prefers-reduced-motion the text just renders, fully visible.
 */
export function ScrubHeadline({ as: Tag = 'h2', className, children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(el, { type: 'words', wordsClass: 'split-word' });
      gsap.set(split.words, { display: 'inline-block' });
      gsap.fromTo(
        split.words,
        { opacity: 0.12, y: 30 },
        {
          opacity: 1,
          y: 0,
          ease: 'none',
          stagger: 0.08,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 40%',
            scrub: 0.5,
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
