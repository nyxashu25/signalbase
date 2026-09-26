import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

const EASE = [0.2, 0.8, 0.2, 1];
const INTERACTIVE = 'a, button, [role="button"], [data-cursor]';

// Ring size and tone per mode. Width/height animate (not scale) so the
// "Drag" label inside stays crisp at its own font size.
const RING = {
  default: { width: 34, height: 34, borderColor: 'rgba(207,112,255,0.5)', backgroundColor: 'rgba(170,0,255,0)' },
  hover: { width: 54, height: 54, borderColor: 'rgba(221,153,255,0.9)', backgroundColor: 'rgba(170,0,255,0.10)' },
  grab: { width: 64, height: 64, borderColor: 'rgba(231,179,255,0.95)', backgroundColor: 'rgba(170,0,255,0.16)' },
};

function canUseCustomCursor() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(pointer: fine)').matches);
}

/**
 * The storybook's pointer companion on mouse/trackpad devices: a small
 * mauve dot riding just behind the native cursor and a larger ring that
 * trails it on a softer spring. Over links, buttons and [data-cursor]
 * elements the ring widens and brightens; over [data-world-grab] areas (the
 * drag-to-spin hero) it grows further and reads "Drag".
 *
 * Purely decorative (aria-hidden, pointer-events-none) and additive — the
 * native cursor stays visible. Not rendered on coarse pointers or under
 * reduced motion.
 */
export function CustomCursor() {
  const reduceMotion = useReducedMotion();
  const [finePointer] = useState(canUseCustomCursor);
  if (reduceMotion || !finePointer) return null;
  return <CursorLayer />;
}

function CursorLayer() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dotX = useSpring(x, { stiffness: 1100, damping: 60, mass: 0.2 });
  const dotY = useSpring(y, { stiffness: 1100, damping: 60, mass: 0.2 });
  const ringX = useSpring(x, { stiffness: 320, damping: 30, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 320, damping: 30, mass: 0.5 });
  const [mode, setMode] = useState('default');
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const visibleRef = useRef(false);

  useEffect(() => {
    function show(nextVisible) {
      if (visibleRef.current === nextVisible) return;
      visibleRef.current = nextVisible;
      setVisible(nextVisible);
    }
    function onMove(e) {
      if (e.pointerType === 'touch') {
        show(false);
        return;
      }
      if (!visibleRef.current) {
        // Appear where the pointer is, not sweeping in from the corner.
        x.jump(e.clientX);
        y.jump(e.clientY);
        dotX.jump(e.clientX);
        dotY.jump(e.clientY);
        ringX.jump(e.clientX);
        ringY.jump(e.clientY);
      } else {
        x.set(e.clientX);
        y.set(e.clientY);
      }
      show(true);
    }
    function onOver(e) {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (target.closest('[data-world-grab]')) setMode('grab');
      else if (target.closest(INTERACTIVE)) setMode('hover');
      else setMode('default');
    }
    const onLeave = () => show(false);
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [x, y, dotX, dotY, ringX, ringY]);

  const ring = RING[mode];
  const shrink = pressed ? 0.82 : 1;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[60]">
      <motion.div className="absolute left-0 top-0" style={{ x: ringX, y: ringY }}>
        <motion.div
          className="absolute left-0 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          initial={false}
          animate={{
            ...ring,
            width: ring.width * shrink,
            height: ring.height * shrink,
            opacity: visible ? 1 : 0,
          }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          <motion.span
            className="select-none text-[9px] font-bold uppercase tracking-[0.2em] text-white"
            initial={false}
            animate={{ opacity: mode === 'grab' ? 1 : 0 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            Drag
          </motion.span>
        </motion.div>
      </motion.div>
      <motion.div className="absolute left-0 top-0" style={{ x: dotX, y: dotY }}>
        <motion.div
          className="absolute left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mauve-magic shadow-[0_0_10px_rgba(207,112,255,0.8)]"
          initial={false}
          animate={{ opacity: visible && mode === 'default' ? 1 : 0 }}
          transition={{ duration: 0.12, ease: EASE }}
        />
      </motion.div>
    </div>
  );
}
