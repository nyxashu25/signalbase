import { useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

// ζ = damping / (2·√(stiffness·mass)) ≈ 1.02: settles without overshoot.
const SPRING = { stiffness: 220, damping: 18, mass: 0.35 };

function hasFinePointer() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(pointer: fine)').matches);
}

/**
 * Pulls its child a few pixels toward the pointer while hovered, on a soft
 * spring, and lets it settle back on leave — the small "this is the thing to
 * press" tell on primary CTAs. The pull is `strength` × the pointer's offset
 * from center, capped at `max` px — a few pixels at most (DESIGN_LANGUAGE.md
 * §12 keeps hover motion to a small lift), on a critically damped spring so
 * it never overshoots.
 *
 * The outer element (`as`, `className`) owns layout and hit-testing and
 * never moves; only the inner span translates, so the measurement doesn't
 * chase itself. A no-op wrapper with the same structure under reduced
 * motion and on coarse (touch) pointers.
 */
export function Magnetic({ children, as: Tag = 'span', className = 'inline-block', strength = 0.3, max = 4 }) {
  const reduceMotion = useReducedMotion();
  const [finePointer] = useState(hasFinePointer);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  if (reduceMotion || !finePointer) {
    return (
      <Tag className={className}>
        <span className="block">{children}</span>
      </Tag>
    );
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    let dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
    let dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
    const length = Math.hypot(dx, dy);
    if (length > max) {
      dx = (dx / length) * max;
      dy = (dy / length) * max;
    }
    x.set(dx);
    y.set(dy);
  }
  function onPointerLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <Tag className={className} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <motion.span className="block" style={{ x: sx, y: sy }}>
        {children}
      </motion.span>
    </Tag>
  );
}
