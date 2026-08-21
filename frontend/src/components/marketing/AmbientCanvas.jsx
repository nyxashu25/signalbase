import { useEffect, useRef } from 'react';

// Brand gradient stops (see tailwind.config.js --dp-gradient-brand / the
// hero's existing radial-gradient CSS) reused here so the canvas reads as
// the same aurora, just given real depth and drift instead of two static
// CSS radial-gradients.
const BLOB_COLORS = ['148,0,222', '190,61,255', '124,0,186', '207,112,255'];
const PARTICLE_COLOR = '223,179,255';

function makeBlobs(width, height) {
  return BLOB_COLORS.map((color, i) => ({
    color,
    baseX: width * (0.15 + i * 0.28 + (i % 2) * 0.1),
    baseY: height * (0.2 + ((i * 37) % 60) / 100),
    radius: Math.max(width, height) * (0.28 + i * 0.03),
    speed: 0.00018 + i * 0.00006,
    phase: i * 1.7,
    driftX: width * 0.06,
    driftY: height * 0.05,
  }));
}

function makeParticles(width, height, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.6 + Math.random() * 1.6,
    speed: 0.008 + Math.random() * 0.02,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.0006 + Math.random() * 0.001,
  }));
}

/**
 * A full-bleed animated aurora + particle field, drawn on canvas rather
 * than as static CSS gradients — cheap enough to run continuously (no
 * WebGL context, no shaders) while still giving the hero real depth and
 * motion. Freezes to a single static frame under prefers-reduced-motion,
 * and pauses its rAF loop whenever off-screen or the tab is hidden.
 */
export function AmbientCanvas({ className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // No 2D context (jsdom in tests has no canvas backend, and it's a
    // reasonable defensive check for a real browser too) — nothing to draw.
    if (!ctx) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let blobs = [];
    let particles = [];
    let rafId = null;
    let running = false;
    let pointerX = 0.5;
    let pointerY = 0.4;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      blobs = makeBlobs(width, height);
      particles = makeParticles(width, height, Math.min(50, Math.round((width * height) / 22000)));
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      for (const b of blobs) {
        const t = reduceMotion ? 0 : time * b.speed + b.phase;
        const px = reduceMotion ? 0 : (pointerX - 0.5) * 24;
        const py = reduceMotion ? 0 : (pointerY - 0.5) * 24;
        const x = b.baseX + Math.cos(t) * b.driftX + px;
        const y = b.baseY + Math.sin(t * 0.8) * b.driftY + py;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, b.radius);
        gradient.addColorStop(0, `rgba(${b.color},0.32)`);
        gradient.addColorStop(1, `rgba(${b.color},0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.globalCompositeOperation = 'source-over';

      for (const p of particles) {
        const twinkle = reduceMotion ? 0.7 : 0.4 + Math.sin(time * p.twinkleSpeed + p.twinklePhase) * 0.3;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${PARTICLE_COLOR},${twinkle})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduceMotion) {
          p.y -= p.speed * 16;
          if (p.y < -4) {
            p.y = height + 4;
            p.x = Math.random() * width;
          }
        }
      }
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

    function handlePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointerX = (e.clientX - rect.left) / rect.width;
      pointerY = (e.clientY - rect.top) / rect.height;
    }

    resize();
    draw(0);
    if (!reduceMotion) start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(canvas.parentElement);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (reduceMotion) return;
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    function handleVisibility() {
      if (reduceMotion) return;
      if (document.hidden) stop();
      else start();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
