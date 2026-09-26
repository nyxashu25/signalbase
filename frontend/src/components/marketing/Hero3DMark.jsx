import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Geometry lifted verbatim from logos/datapit-mark.svg (viewBox 0 0 160 160):
// three signal nodes, three ascending data bars, and the open D.
const NODES = [
  { cx: 21, cy: 91, r: 5 },
  { cx: 29, cy: 72, r: 6 },
  { cx: 41, cy: 53, r: 7 },
];
const BARS = [
  { x: 22, y: 101, w: 13, h: 25, rx: 6.5 },
  { x: 40, y: 84, w: 15, h: 42, rx: 7.5 },
  { x: 60, y: 63, w: 16, h: 63, rx: 8 },
];
const D_PATH = 'M79 34H91C121 34 140 52 140 80C140 108 121 126 91 126H79';

// Extrusion depth: the mark is stacked as LAYERS copies, each pushed further
// back on z. Only the front face carries the brand gradient; the slices
// behind it darken from Indigo 2 toward the deep canvas, so the stack reads
// as one solid block once the stage rotates.
const LAYERS = 14;
const LAYER_GAP = 2.6;
const BACK_TONES = ['#5f0a8f', '#560a82', '#4d0a76', '#450969', '#3d085d', '#360751', '#2f0646'];

function layerTone(i) {
  if (i === 0) return null;
  const idx = Math.min(BACK_TONES.length - 1, Math.floor(((i - 1) / (LAYERS - 1)) * BACK_TONES.length));
  return BACK_TONES[idx];
}

function MarkLayer({ index, gradientId }) {
  const tone = layerTone(index);
  const fill = tone ?? `url(#${gradientId})`;
  return (
    <svg
      viewBox="0 0 160 160"
      className="absolute inset-0 h-full w-full backface-hidden"
      style={{
        transform: `translateZ(${-index * LAYER_GAP}px)`,
        filter: index === 0 ? 'drop-shadow(0 0 22px rgba(197,82,255,0.55))' : undefined,
      }}
      aria-hidden="true"
    >
      {index === 0 && (
        <defs>
          <linearGradient id={gradientId} x1="16" y1="24" x2="142" y2="138" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7C00BA" />
            <stop offset=".28" stopColor="#AA00FF" />
            <stop offset=".58" stopColor="#BE3DFF" />
            <stop offset=".82" stopColor="#C552FF" />
            <stop offset="1" stopColor="#CF70FF" />
          </linearGradient>
        </defs>
      )}
      <g fill={fill}>
        {NODES.map((n) => (
          <circle key={`${n.cx}-${n.cy}`} cx={n.cx} cy={n.cy} r={n.r} />
        ))}
        {BARS.map((b) => (
          <rect key={b.x} x={b.x} y={b.y} width={b.w} height={b.h} rx={b.rx} />
        ))}
      </g>
      <path d={D_PATH} fill="none" stroke={fill} strokeWidth="23" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The DataPit mark as a real CSS-3D object — the moodboard's isometric D
 * and data bars, floating over a lit platform with two orbiting signal
 * nodes. The stage tilts toward the pointer (spring-smoothed), idles on a
 * slow turn, and — when `sinkWith` points at the enclosing hero section —
 * recedes into depth and blurs as the reader scrolls down into the pit.
 *
 * Reduced motion: a single flat layer, no idle turn, no orbit, no sink.
 */
export function Hero3DMark({ className = '', sinkWith = null, size = 'lg' }) {
  const reduceMotion = useReducedMotion();
  const gradientId = `dp-mark-gradient-${useId().replace(/:/g, '')}`;
  const stageRef = useRef(null);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const springX = useSpring(tiltX, { stiffness: 60, damping: 18, mass: 0.6 });
  const springY = useSpring(tiltY, { stiffness: 60, damping: 18, mass: 0.6 });

  // Pointer parallax across the whole window, so the mark follows the reader
  // even while they're on the headline beside it.
  useEffect(() => {
    if (reduceMotion) return undefined;
    function onMove(e) {
      const px = e.clientX / window.innerWidth - 0.5;
      const py = e.clientY / window.innerHeight - 0.5;
      tiltY.set(px * 26);
      tiltX.set(-py * 18);
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduceMotion, tiltX, tiltY]);

  // Descend into the pit: as the hero scrolls away the whole stage tips
  // back, sinks, and dissolves.
  useLayoutEffect(() => {
    if (reduceMotion) return undefined;
    const section = sinkWith?.current;
    const stage = stageRef.current;
    if (!section || !stage) return undefined;
    const ctx = gsap.context(() => {
      gsap.to(stage, {
        y: 220,
        rotateX: 34,
        scale: 0.82,
        opacity: 0.08,
        filter: 'blur(10px)',
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: 0.8 },
      });
    }, stage);
    return () => ctx.revert();
  }, [reduceMotion, sinkWith]);

  const dimension = size === 'lg' ? 'h-[280px] w-[280px] sm:h-[360px] sm:w-[360px] lg:h-[440px] lg:w-[440px]' : 'h-[200px] w-[200px] sm:h-[260px] sm:w-[260px]';
  const layers = reduceMotion ? [0] : Array.from({ length: LAYERS }, (_, i) => i);

  return (
    <div ref={stageRef} className={`relative ${dimension} ${className}`} style={{ perspective: 1200 }}>
      <motion.div
        className="preserve-3d relative h-full w-full"
        style={{ rotateX: springX, rotateY: springY }}
      >
        <div className={`preserve-3d relative h-full w-full ${reduceMotion ? '' : 'story-idle-turn'}`}>
          {/* Lit platform under the mark */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[86%] h-[38%] w-[150%] -translate-x-1/2 rounded-[50%]"
            style={{
              transform: 'translateX(-50%) rotateX(78deg) translateZ(-120px)',
              background:
                'radial-gradient(ellipse at center, rgba(190,61,255,0.55) 0%, rgba(124,0,186,0.32) 35%, rgba(68,0,102,0.12) 60%, transparent 72%)',
              filter: 'blur(6px)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[86%] h-[38%] w-[120%] -translate-x-1/2 rounded-[50%] border border-neon-violet/40"
            style={{ transform: 'translateX(-50%) rotateX(78deg) translateZ(-118px)' }}
          />

          {/* Orbiting signal nodes */}
          {!reduceMotion && (
            <>
              <div
                aria-hidden="true"
                className="story-orbit absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-mauve-magic/30"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <span
                  className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-violet shadow-[0_0_18px_rgba(197,82,255,0.9)]"
                  style={{ transform: 'translate(-50%,-50%) rotateX(-72deg)' }}
                />
              </div>
              <div
                aria-hidden="true"
                className="story-orbit-b absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-2/60"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <span
                  className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mauve-magic shadow-[0_0_14px_rgba(207,112,255,0.9)]"
                  style={{ transform: 'translate(-50%,-50%) rotateX(-72deg)' }}
                />
              </div>
            </>
          )}

          {/* The extruded mark */}
          <div className={`preserve-3d absolute inset-[14%] ${reduceMotion ? '' : 'story-float'}`}>
            <div className="preserve-3d relative h-full w-full">
              {layers.map((i) => (
                <MarkLayer key={i} index={i} gradientId={gradientId} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
