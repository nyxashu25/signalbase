import { useEffect, useRef } from 'react';

// The brand's violet signal ramp (DESIGN_LANGUAGE.md §3), as RGB triplets for
// per-particle alpha: mauve magic, hyper magenta, neon violet, mauve.
const RAMP = [
  [207, 112, 255],
  [190, 61, 255],
  [197, 82, 255],
  [221, 153, 255],
];
// The same tones as fill styles; each particle's alpha goes on globalAlpha,
// so no color string is built (and parsed) per particle per frame.
const RAMP_FILL = RAMP.map(([r, g, b]) => `rgb(${r},${g},${b})`);

// Both write into `out` (reused every frame) instead of allocating.
function cubicAt(p0, p1, p2, p3, t, out) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  out.x = a * p0.x + b * p1.x + c * p2.x + d * p3.x;
  out.y = a * p0.y + b * p1.y + c * p2.y + d * p3.y;
  return out;
}

function cubicTangent(p0, p1, p2, p3, t, out) {
  const mt = 1 - t;
  out.x = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  out.y = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return out;
}

/**
 * The signal river — the artwork that flows through the whole storybook.
 *
 * A fixed, full-viewport canvas draws one luminous bezier ribbon ("the
 * signal trail" from the brand's imagery vocabulary) with a stream of
 * particles travelling along it. The ribbon's shape is a function of both
 * time and scroll progress, so it keeps flowing while you read and
 * re-shapes itself as you move through the page; the particles speed up and
 * brighten with your scroll velocity, so the artwork responds to your
 * reading pace. Drawn behind the page content (MarketingLayout's backdrop):
 * `deep` sections are transparent and let it show through, `surface`
 * sections cover it.
 *
 * One static frame under prefers-reduced-motion; the rAF loop pauses while
 * the tab is hidden. No WebGL, no shaders — a 2D context is plenty.
 */
export function SignalRiver({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // jsdom (tests) has no canvas backend; a real browser always does.
    if (!ctx) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let rafId = null;
    let running = false;
    let lastScrollY = window.scrollY;
    let lastTime = 0;
    let velocity = 0; // px per ms, smoothed
    const pt = { x: 0, y: 0 };
    const tg = { x: 0, y: 0 };

    // Scroll position and page height, kept current by a scroll listener and
    // a resize observer rather than read every frame: reading them from the
    // frame loop forced a style and layout pass whenever anything on the
    // page had changed since the last frame.
    let scrollY = window.scrollY;
    let docHeight = document.documentElement.scrollHeight;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const measureDoc = () => {
      docHeight = document.documentElement.scrollHeight;
    };
    const docObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureDoc) : null;

    function makeParticle() {
      return {
        u: Math.random(),
        offset: Math.random() * 2 - 1,
        size: 0.8 + Math.random() * 2.4,
        speed: 0.00005 + Math.random() * 0.0001,
        tone: Math.floor(Math.random() * RAMP.length),
        twinkle: Math.random() * Math.PI * 2,
      };
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(coarsePointer ? 70 : 150, Math.round((width * height) / 9000));
      particles = Array.from({ length: count }, makeParticle);
    }

    // The ribbon's four anchors: a slow time-based drift plus a scroll-based
    // phase, so the river both flows on its own and re-shapes with the page.
    function anchors(time, progress) {
      const drift = (i, amp) => Math.sin(time * 0.00022 + i * 1.7 + progress * 7) * amp;
      const cx = width * 0.64;
      return [
        { x: cx + drift(0, width * 0.1), y: -0.08 * height },
        { x: cx - width * 0.2 + drift(1, width * 0.22), y: 0.32 * height },
        { x: cx + width * 0.18 + drift(2, width * 0.22), y: 0.66 * height },
        { x: cx + drift(3, width * 0.1), y: 1.08 * height },
      ];
    }

    function draw(time) {
      const maxScroll = Math.max(1, docHeight - height);
      const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
      const dt = lastTime ? Math.min(48, time - lastTime) : 16;
      lastTime = time;
      const instant = (scrollY - lastScrollY) / dt;
      lastScrollY = scrollY;
      velocity += (instant - velocity) * 0.12;
      const energy = reduceMotion ? 0 : Math.min(1, Math.abs(velocity) * 0.35);

      ctx.clearRect(0, 0, width, height);
      const [p0, p1, p2, p3] = anchors(reduceMotion ? 0 : time, progress);

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const path = new Path2D();
      path.moveTo(p0.x, p0.y);
      path.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

      // Three strokes: a wide soft glow, a mid body, and a bright core.
      ctx.lineWidth = 120;
      ctx.strokeStyle = `rgba(124,0,186,${0.045 + energy * 0.05})`;
      ctx.stroke(path);
      ctx.lineWidth = 36;
      ctx.strokeStyle = `rgba(170,0,255,${0.07 + energy * 0.09})`;
      ctx.stroke(path);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = `rgba(207,112,255,${0.2 + energy * 0.35})`;
      ctx.stroke(path);

      for (const p of particles) {
        if (!reduceMotion) {
          p.u += p.speed * dt * (1 + energy * 5) + velocity * dt * 0.00004;
          if (p.u > 1) p.u -= 1;
          if (p.u < 0) p.u += 1;
        }
        cubicAt(p0, p1, p2, p3, p.u, pt);
        cubicTangent(p0, p1, p2, p3, p.u, tg);
        const len = Math.hypot(tg.x, tg.y) || 1;
        const nx = -tg.y / len;
        const ny = tg.x / len;
        const spread = 28 + 34 * Math.sin(p.u * Math.PI);
        const x = pt.x + nx * p.offset * spread;
        const y = pt.y + ny * p.offset * spread;
        const twinkle = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(time * 0.002 + p.twinkle);
        const alpha = (0.28 + energy * 0.5) * twinkle * (1 - Math.abs(p.offset) * 0.45);
        ctx.beginPath();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = RAMP_FILL[p.tone];
        ctx.arc(x, y, p.size * (1 + energy * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    function loop(time) {
      if (!running) return;
      draw(time);
      rafId = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }
    function handleVisibility() {
      if (reduceMotion) return;
      if (document.hidden) stop();
      else start();
    }

    resize();
    draw(0);
    if (!reduceMotion) start();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    docObserver?.observe(document.documentElement);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      docObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 ${className}`}
    />
  );
}
