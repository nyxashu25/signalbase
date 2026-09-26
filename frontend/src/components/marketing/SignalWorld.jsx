import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { setWorldHandle, setWorldState, useWorldState } from './worldStore.js';

// Station keys the engine understands (world/README.md → "Station keys").
// Kept as a plain list here rather than imported from world/pieces so this
// module never pulls `three` into the main bundle or into jsdom.
const STATION_KEYS = new Set([
  'mark',
  'tunnel',
  'reveal',
  'sequence',
  'ledger',
  'lens',
  'crystals',
  'city',
  'blocks',
  'drift',
]);

// How long to hold the old page's stations after a route change if the new
// page never announces itself (a failed chunk load, say).
const ROUTE_FREEZE_FALLBACK_MS = 2500;
// The engine's warp pulse (world/engine.js WARP_TOTAL is 0.9 s). A station
// swap that lands later than this gets a fresh warp to hide the cut.
const WARP_COVER_MS = 850;
// Give up on the engine (chunk fetch + parse + shader compile) after this
// long and leave the CSS backdrop in place.
const BOOT_TIMEOUT_MS = 10000;
// Trailing debounce for viewport resizes: reallocating the composer and bloom
// targets on every frame of a window drag is wasted work.
const RESIZE_SETTLE_MS = 150;
// Coarse pointers: height-only changes smaller than this fraction of the
// viewport are the browser toolbar sliding, not a real resize.
const TOOLBAR_SLACK = 0.2;

// Pointer-downs on these never start a hero drag, even inside a grab area
// (the whole cover is one on narrow screens).
const INTERACTIVE =
  'a, button, input, textarea, select, label, summary, [role="button"], [contenteditable=""], [contenteditable="true"]';

// Software rasterizers render the world at single-digit frame rates; the CSS
// backdrop is the better experience there.
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|basic render|software|mesa offscreen/i;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * The engine loader, on an object so tests can spy on it and prove the
 * WebGL chunk is never requested where the capability gate fails.
 */
export const engineLoader = {
  load: () => import('./world/engine.js'),
};

let webgl2Probe;

/** Forget the cached WebGL2 probe (tests stub the capability both ways). */
export function resetWorldCapabilityCache() {
  webgl2Probe = undefined;
}

function isSoftwareRenderer(gl) {
  try {
    // Firefox reports the (sanitized) real renderer here; Chromium and
    // WebKit report a generic name and need the debug extension.
    let name = gl.getParameter(gl.RENDERER);
    if (typeof name === 'string' && SOFTWARE_RENDERER.test(name)) return true;
    if (typeof name !== 'string' || /^webkit webgl$/i.test(name)) {
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      if (info) name = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    }
    return typeof name === 'string' && SOFTWARE_RENDERER.test(name);
  } catch {
    return false;
  }
}

/**
 * The real capability probe: a WebGL2 context the browser will hand over
 * without a major performance caveat (no software fallback, no blocklisted
 * GPU), on a renderer that isn't a known software rasterizer. Costs a real
 * context creation, so it runs in the idle-time boot, never before paint.
 */
function probeWebGL2() {
  if (webgl2Probe !== undefined) return webgl2Probe;
  webgl2Probe = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (gl) {
      webgl2Probe = !isSoftwareRenderer(gl);
      // Hand the throwaway context straight back; browsers cap live contexts.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webgl2Probe = false;
  }
  return webgl2Probe;
}

/**
 * The cheap, synchronous half of the capability gate (safe before first
 * paint): motion allowed and WebGL2 present at all. The real context probe
 * runs later, in the idle boot, and falls back to the CSS StoryBackdrop
 * (gradients + 2D signal river) if it fails.
 */
export function canRenderWorld() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.(REDUCED_MOTION).matches) return false;
  // jsdom has no WebGL2RenderingContext, so tests stop here and never probe.
  return typeof window.WebGL2RenderingContext !== 'undefined';
}

export function detectWorldQuality() {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency;
  const memory = navigator.deviceMemory;
  const screenW = window.screen?.width || window.innerWidth;
  const screenH = window.screen?.height || window.innerHeight;
  const low =
    coarse ||
    (typeof cores === 'number' && cores <= 4) ||
    (typeof memory === 'number' && memory <= 4) ||
    Math.min(screenW, screenH) < 700;
  return low ? 'low' : 'high';
}

function readStation(el, index) {
  const rawKey = el.dataset.station;
  const key = rawKey && STATION_KEYS.has(rawKey) ? rawKey : 'drift';
  const rawSide = Number(el.dataset.stationSide ?? (index % 2 ? -1 : 1));
  const side = Number.isFinite(rawSide) ? Math.max(-1, Math.min(1, Math.round(rawSide))) : 1;
  const station = { key, side };
  // Optional placement (world/README.md "Station placement"): only passed on
  // when the chapter asks for it, so plain stations keep the default framing.
  const { stationX, stationLift, stationSize } = el.dataset;
  if (stationX !== undefined && Number.isFinite(Number(stationX))) station.x = Number(stationX);
  if (stationLift !== undefined && Number.isFinite(Number(stationLift))) station.lift = Number(stationLift);
  if (stationSize !== undefined && Number.isFinite(Number(stationSize))) station.size = Number(stationSize);
  return station;
}

// Document-relative top from the offsetParent chain: layout positions, so a
// page mid-transition (scaled, blurred) still measures where it will rest.
function documentTop(el) {
  let top = 0;
  for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
  return top;
}

function scheduleIdle(fn) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 1200 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 120);
  return () => window.clearTimeout(id);
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// Spread runs of equal rest points (short chapters clamped to the same end
// of the scroll range) evenly between their neighbours, so every station
// still gets its own stretch of scroll instead of a jump.
function spreadCollapsed(mids) {
  const n = mids.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && Math.abs(mids[j + 1] - mids[i]) < 0.5) j++;
    if (j > i) {
      const lo = i > 0 ? i - 1 : i;
      const hi = j < n - 1 ? j + 1 : j;
      if (hi > lo && mids[hi] > mids[lo]) {
        for (let k = lo + 1; k < hi; k++) {
          mids[k] = mids[lo] + ((mids[hi] - mids[lo]) * (k - lo)) / (hi - lo);
        }
      }
    }
    i = j + 1;
  }
}

/**
 * The React host of the Signal World (see world/README.md): one persistent
 * WebGL canvas fixed behind every marketing page. It gates on capability,
 * lazy-loads the engine after first paint, and feeds it everything it needs
 * from the DOM — the page's stations (one per [data-chapter], keyed by
 * data-station / data-station-side), a continuous scroll coordinate, the
 * pointer, hero drags on [data-world-grab] areas, viewport size, tab
 * visibility, and a warp pulse on every route change.
 *
 * Renders nothing when the gate fails (reduced motion, no WebGL2, jsdom),
 * and tears itself down to the CSS fallback if the capability probe fails,
 * the engine fails to load (or takes too long), the GL context is lost, or
 * the reader turns on reduced motion mid-visit.
 */
export function SignalWorld({ pathname }) {
  const hostRef = useRef(null);
  const bridgeRef = useRef(null);
  const lastPathRef = useRef(pathname);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  // Touch screens size the canvas to the large viewport, so the browser
  // toolbar sliding in and out never resizes (or stretches) the world.
  const [coarse] = useState(() => Boolean(window.matchMedia?.('(pointer: coarse)').matches));
  const { ready } = useWorldState();

  // The cheap gate runs before paint so the covers and intro overlay already
  // know the world is coming on their first visible frame.
  useLayoutEffect(() => {
    if (!canRenderWorld()) return undefined;
    setEnabled(true);
    setWorldState({ active: true, ready: false });
    // Reduced motion switched on mid-visit: back to the CSS backdrop, and
    // stay there.
    const motionPref = window.matchMedia?.(REDUCED_MOTION);
    const onMotionPref = () => {
      if (!motionPref.matches) return;
      setWorldState({ active: false, ready: false });
      setFailed(true);
    };
    motionPref?.addEventListener?.('change', onMotionPref);
    return () => {
      motionPref?.removeEventListener?.('change', onMotionPref);
      setWorldState({ active: false, ready: false });
    };
  }, []);

  useEffect(() => {
    if (!enabled || failed) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let world = null;
    let canvas = null;
    let rafId = 0;
    let running = false;
    let bootTimer = 0;

    // Chapter geometry, and each chapter's scroll rest point (where the
    // viewport centre sits when that chapter is centred).
    let chapters = [];
    let mids = [];
    let midsFor = '';
    let docHeight = 0;
    let stationSig = '';
    let needsMeasure = true;

    // Route changes.
    let frozen = false;
    let freezeTimer = 0;
    let routePending = false;
    let lastSentEmpty = false;
    let lastWarpAt = -Infinity;

    let lastScroll = Number.NaN;
    let sentW = 0;
    let sentH = 0;
    let pendingW = 0;
    let pendingH = 0;
    let resizeAt = 0;
    let readyNotified = false;
    let drag = null;

    // --- stations + chapter geometry -------------------------------------
    function measureChapters() {
      const els = document.querySelectorAll('[data-chapter]');
      const nextChapters = [];
      const stations = [];
      els.forEach((el, i) => {
        nextChapters.push({ top: documentTop(el), height: Math.max(1, el.offsetHeight) });
        stations.push(readStation(el, i));
      });
      chapters = nextChapters;
      docHeight = document.documentElement.scrollHeight;
      midsFor = '';
      const empty = stations.length === 0;
      if (empty) stations.push({ key: 'drift', side: 0 });
      return { stations, empty };
    }

    function warp() {
      if (!world) return;
      world.warp();
      lastWarpAt = nowMs();
    }

    function sendStations({ stations, empty }) {
      const sig = stations.map((s) => `${s.key}:${s.side}:${s.x ?? ''}:${s.lift ?? ''}:${s.size ?? ''}`).join('|');
      if (sig === stationSig) return;
      stationSig = sig;
      // A swap that arrives after the route-change warp has faded (a slow
      // lazy chunk, the freeze fallback, pieces arriving after an empty
      // boot) gets a fresh warp, so pieces never hard-cut in or out.
      if ((routePending || lastSentEmpty) && nowMs() - lastWarpAt > WARP_COVER_MS) warp();
      if (!empty) routePending = false;
      lastSentEmpty = empty;
      world.setStations(stations);
    }

    // s = k when chapter k is centred in the viewport. Rest points are
    // clamped to where the viewport centre can actually reach (so s = 0 at
    // the top of every page, and the last station at the very bottom) and
    // s runs linearly between consecutive rest points.
    function scrollCoordinate() {
      const n = chapters.length;
      if (n === 0) return 0;
      const vh = window.innerHeight;
      const half = vh / 2;
      const key = `${vh}|${docHeight}`;
      if (midsFor !== key) {
        midsFor = key;
        const maxCenter = Math.max(half, docHeight - half);
        mids = chapters.map(({ top, height }) => Math.min(maxCenter, Math.max(half, top + height / 2)));
        for (let k = 1; k < n; k++) if (mids[k] < mids[k - 1]) mids[k] = mids[k - 1];
        spreadCollapsed(mids);
      }
      const center = window.scrollY + half;
      if (center <= mids[0]) return 0;
      for (let k = 1; k < n; k++) {
        if (center < mids[k]) {
          const span = mids[k] - mids[k - 1];
          return span > 0 ? k - 1 + (center - mids[k - 1]) / span : k;
        }
      }
      return n - 1;
    }

    // --- viewport size ---------------------------------------------------
    function viewportSize() {
      return [host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight];
    }
    function noteSize(w, h) {
      if (!(w > 0) || !(h > 0)) return;
      if (w === pendingW && h === pendingH) return;
      pendingW = w;
      pendingH = h;
      resizeAt = nowMs();
    }
    function sendSize(w, h) {
      sentW = w;
      sentH = h;
      world.resize(w, h);
    }
    function applyPendingSize(now) {
      if (pendingW === sentW && pendingH === sentH) return;
      if (coarse && pendingW === sentW && Math.abs(pendingH - sentH) < sentH * TOOLBAR_SLACK) {
        // The toolbar sliding: keep the current buffer and framing.
        pendingH = sentH;
        return;
      }
      if (sentW > 0 && now - resizeAt < RESIZE_SETTLE_MS) return;
      sendSize(pendingW, pendingH);
      needsMeasure = true;
    }

    // --- frame loop ------------------------------------------------------
    function frame() {
      rafId = requestAnimationFrame(frame);
      if (!world) return;
      applyPendingSize(nowMs());
      if (!frozen) {
        // Scroll first, then stations: a layout the engine cuts to (first
        // layout, or under the warp) lands on the right station instead of
        // flying there from the old one.
        const layout = needsMeasure ? measureChapters() : null;
        needsMeasure = false;
        const s = scrollCoordinate();
        if (s !== lastScroll) {
          lastScroll = s;
          world.setScroll(s);
        }
        if (layout) sendStations(layout);
      }
      if (!readyNotified && world.ready) {
        readyNotified = true;
        setWorldState({ ready: true });
      }
    }
    function startLoop() {
      if (running || !world) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    function stopLoop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    // --- DOM inputs ------------------------------------------------------
    // `force` only from the freeze fallback. A story:page-ready that fires
    // while the lazy page chunk is still loading (the enter animation
    // finishing over the Suspense fallback) is ignored — its real one follows.
    function onPageReady(force) {
      if (force !== true && !document.querySelector('[data-chapter]')) return;
      frozen = false;
      window.clearTimeout(freezeTimer);
      needsMeasure = true;
    }
    function onResize() {
      const [w, h] = viewportSize();
      noteSize(w, h);
      needsMeasure = true;
    }
    function onVisibility() {
      const hidden = document.hidden;
      world?.setPaused(hidden);
      if (hidden) stopLoop();
      else startLoop();
    }
    function onPointerMove(e) {
      if (!world) return;
      if (drag && e.pointerId === drag.id) {
        world.grab(e.clientX - drag.x, e.clientY - drag.y);
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
      if (e.pointerType === 'touch') return;
      world.setPointer((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2);
    }
    function onPointerDown(e) {
      if (!world || drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!(e.target instanceof Element) || e.target.closest(INTERACTIVE)) return;
      const target = e.target.closest('[data-world-grab]');
      if (!target) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, el: target };
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Capture is a nicety (drags that leave the area keep spinning).
      }
      document.documentElement.setAttribute('data-world-grabbing', '');
      if (e.pointerType === 'mouse') e.preventDefault(); // no text selection
    }
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const { el, id } = drag;
      drag = null;
      try {
        if (el.hasPointerCapture?.(id)) el.releasePointerCapture(id);
      } catch {
        // Already released.
      }
      document.documentElement.removeAttribute('data-world-grabbing');
      world?.release();
    }

    // --- lifecycle -------------------------------------------------------
    function teardown() {
      stopLoop();
      endDrag();
      window.clearTimeout(bootTimer);
      if (world) {
        try {
          world.dispose();
        } catch {
          // A dispose that throws must not keep the fallback from showing.
        }
        world = null;
      }
      setWorldHandle(null);
      canvas?.remove();
      canvas = null;
      document.documentElement.removeAttribute('data-world-quality');
    }
    function fail() {
      if (cancelled) return;
      teardown();
      setWorldState({ active: false, ready: false });
      setFailed(true);
    }

    bridgeRef.current = {
      routeChange() {
        warp();
        frozen = true;
        routePending = true;
        stationSig = ''; // the next page always re-lays its stations
        window.clearTimeout(freezeTimer);
        freezeTimer = window.setTimeout(() => onPageReady(true), ROUTE_FREEZE_FALLBACK_MS);
      },
    };

    const bodyRO = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => (needsMeasure = true)) : null;
    bodyRO?.observe(document.body);
    // The host's own size, read without forcing layout; also catches a tab
    // that booted while its viewport was still zero-sized.
    const hostRO =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const box = entries[entries.length - 1]?.contentRect;
            if (box) noteSize(Math.round(box.width), Math.round(box.height));
          })
        : null;
    hostRO?.observe(host);
    document.fonts?.ready?.then(() => {
      needsMeasure = true;
    });
    window.addEventListener('story:page-ready', onPageReady);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('lostpointercapture', endDrag);
    document.addEventListener('visibilitychange', onVisibility);

    async function boot() {
      if (cancelled) return;
      if (!probeWebGL2()) {
        fail();
        return;
      }
      bootTimer = window.setTimeout(() => {
        if (!world) fail();
      }, BOOT_TIMEOUT_MS);
      try {
        const mod = await engineLoader.load();
        if (cancelled) return;
        const quality = detectWorldQuality();
        document.documentElement.setAttribute('data-world-quality', quality);
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'display:block;width:100%;height:100%;';
        host.appendChild(canvas);
        const created = await mod.createSignalWorld({
          canvas,
          quality,
          onContextLost: fail,
          // Also polled as `world.ready` in the frame loop; whichever lands first.
          onReady: () => {
            if (cancelled || readyNotified) return;
            readyNotified = true;
            setWorldState({ ready: true });
          },
        });
        if (cancelled) {
          created.dispose();
          return;
        }
        window.clearTimeout(bootTimer);
        world = created;
        setWorldHandle(world);
        // Size, then scroll, then stations: the first layout snaps straight
        // to where the reader is (a mid-page reload included).
        const [w, h] = viewportSize();
        pendingW = w;
        pendingH = h;
        sendSize(w, h);
        stationSig = '';
        routePending = false;
        const layout = measureChapters();
        needsMeasure = false;
        lastScroll = scrollCoordinate();
        world.setScroll(lastScroll);
        sendStations(layout);
        if (document.hidden) world.setPaused(true);
        else startLoop();
      } catch (err) {
        if (!cancelled && import.meta.env?.DEV) {
          console.warn('[SignalWorld] falling back to the CSS backdrop:', err);
        }
        fail();
      }
    }

    const cancelIdle = scheduleIdle(boot);

    return () => {
      cancelled = true;
      cancelIdle();
      window.clearTimeout(freezeTimer);
      bodyRO?.disconnect();
      hostRO?.disconnect();
      window.removeEventListener('story:page-ready', onPageReady);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('lostpointercapture', endDrag);
      document.removeEventListener('visibilitychange', onVisibility);
      bridgeRef.current = null;
      teardown();
      setWorldState({ ready: false });
    };
  }, [enabled, failed, coarse]);

  // Route change: the warp fires immediately; the new page's stations arrive
  // with its story:page-ready. Compared against the last seen path (not a
  // first-run flag) so StrictMode's double effect run never fakes a warp.
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    bridgeRef.current?.routeChange();
  }, [pathname]);

  if (!enabled || failed) return null;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-700 ease-brand"
      style={{ opacity: ready ? 1 : 0, height: coarse ? '100lvh' : undefined }}
    />
  );
}
