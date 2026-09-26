import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

/**
 * A card that leans toward the pointer in 3D (a gentle 6° by default) with a
 * violet edge-light that brightens on hover — the storybook's version of a
 * plain feature/plan card. Keeps the children's own DOM untouched (headings,
 * links, forms inside stay exactly as authored), so tests that query by
 * role/text are unaffected. Static under reduced motion.
 */
export function TiltCard({ children, className = '', tilt = 6, featured = false }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 140, damping: 18, mass: 0.4 });
  const sy = useSpring(py, { stiffness: 140, damping: 18, mass: 0.4 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-tilt, tilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [tilt, -tilt]);
  const glowX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const glowY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);

  const frame = `relative rounded-xl border ${
    featured
      ? 'border-primary/50 bg-surface-elevated shadow-dp-md ring-2 ring-primary'
      : 'border-border bg-surface-elevated shadow-dp'
  } ${className}`;

  if (reduceMotion) {
    return <div className={frame}>{children}</div>;
  }

  function onPointerMove(e) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div style={{ perspective: 1100 }} className="h-full">
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className={`group h-full ${frame}`}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'radial-gradient(360px circle at var(--gx) var(--gy), rgba(197,82,255,0.16), transparent 60%)',
            '--gx': glowX,
            '--gy': glowY,
          }}
        />
        <div className="relative h-full" style={{ transform: 'translateZ(18px)' }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
