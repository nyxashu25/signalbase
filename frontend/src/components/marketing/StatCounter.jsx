import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Counts up from 0 to `value`, starting when the element scrolls into view
 * (once). Used only for numbers that are true by construction (credit
 * costs, plan terms) — never fabricated usage/traction stats; see Home.jsx
 * for which numbers this renders.
 */
export function StatCounter({ value, prefix = '', suffix = '', decimals = 0, delay = 0, className }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = (n) => {
      el.textContent = `${prefix}${n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    };

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      render(value);
      return;
    }

    const counter = { val: 0 };
    const tween = gsap.to(counter, {
      val: value,
      duration: 1.6,
      delay,
      ease: 'power2.out',
      paused: true,
      onUpdate: () => render(counter.val),
    });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => tween.play(),
    });

    return () => {
      trigger.kill();
      tween.kill();
    };
  }, [value, prefix, suffix, decimals, delay]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
