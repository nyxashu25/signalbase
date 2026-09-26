import { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

/**
 * A product mockup mounted as a physical plate in the storybook world: a
 * perspective stage, a spring-smoothed tilt toward the pointer, a slab of
 * depth behind it (a darker back panel pushed away on z) and a glow pool
 * beneath, plus a specular sheen that slides with the pointer. Wraps the
 * existing Animated*Mockup components without touching them.
 *
 * `tilt` is the max rotation in degrees. Reduced motion renders the plain
 * children with the static frame only.
 */
export function Plate3D({ children, className = '', tilt = 9, glow = true }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const px = useMotionValue(0); // -0.5 .. 0.5 across the plate
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.5 });
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.5 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-tilt, tilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [tilt, -tilt]);
  const sheenX = useTransform(sx, [-0.5, 0.5], ['-40%', '40%']);
  const sheenY = useTransform(sy, [-0.5, 0.5], ['-40%', '40%']);

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

  if (reduceMotion) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative rounded-xl">{children}</div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ perspective: 1400 }}>
      <motion.div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="preserve-3d relative"
        style={{ rotateX, rotateY }}
      >
        {/* Glow pool under the plate */}
        {glow && (
          <div
            aria-hidden="true"
            className="absolute inset-x-6 -bottom-8 h-16 rounded-[50%] bg-hyper-magenta/40"
            style={{ transform: 'translateZ(-80px)', filter: 'blur(26px)' }}
          />
        )}
        {/* Slab: the plate's thickness */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-xl border border-indigo-2/60 bg-indigo/70"
          style={{ transform: 'translateZ(-26px) scale(1.012)' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-xl bg-indigo-2/50"
          style={{ transform: 'translateZ(-13px) scale(1.006)' }}
        />
        {/* Face */}
        <div className="relative overflow-hidden rounded-xl" style={{ transform: 'translateZ(0)' }}>
          {children}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1/2"
            style={{
              x: sheenX,
              y: sheenY,
              background:
                'linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.09) 50%, transparent 58%)',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
