import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * The classic editorial masked-line reveal: each line sits inside an
 * overflow-hidden wrapper and slides up from behind it on mount, one line
 * after the next. Lines are declared explicitly (content + optional
 * per-line classes for the staggered indents the reference sites use)
 * rather than auto-split, so the line breaks are art-directed instead of
 * whatever the viewport happens to wrap. Static under reduced motion.
 */
export function MaskedLines({ as: Tag = 'h1', className, lines, delay = 0 }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll('[data-line]'),
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay },
      );
    }, el);
    return () => ctx.revert();
  }, [delay]);

  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`block overflow-hidden ${line.className ?? ''}`}>
          <span data-line className="block will-change-transform">
            {line.content}
          </span>
        </span>
      ))}
    </Tag>
  );
}
