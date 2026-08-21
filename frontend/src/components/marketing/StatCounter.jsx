import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Counts up from 0 to `value` on mount. Used only for numbers that are
 * true by construction (credit costs, plan terms) — never fabricated
 * usage/traction stats, see Home.jsx for which numbers this renders.
 */
export function StatCounter({ value, prefix = '', suffix = '', decimals = 0, delay = 0, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
      return;
    }

    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: value,
      duration: 1.3,
      delay,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = `${prefix}${counter.val.toFixed(decimals)}${suffix}`;
      },
    });
    return () => tween.kill();
  }, [value, prefix, suffix, decimals, delay]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
