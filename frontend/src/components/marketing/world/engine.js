// The Signal World engine: one persistent Three.js scene behind the marketing
// storybook. Scroll flies the camera through a chain of stations (one per
// content chapter), each hosting a set piece. See ./README.md for the API and
// the piece contract.
//
// Loaded only through a dynamic import() from ../SignalWorld.jsx, so three.js
// never enters the main bundle or jsdom tests.
//
// Hot-path rule: nothing inside the frame loop allocates. Every vector, the
// piece `state` and the field update payload are created once, up front.

import {
  ACESFilmicToneMapping,
  BackSide,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HalfFloatType,
  HemisphereLight,
  MathUtils,
  PMREMGenerator,
  PerspectiveCamera,
  PointLight,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { THREE } from './threeKit.js';
import { palette } from './palette.js';
import { PIECES } from './pieces/index.js';
import { createSignalField } from './field.js';

// --- layout -----------------------------------------------------------------
const SPACING = 18; // station k sits at z = -k * SPACING
const SIDE_X = 3.4; // lateral offset of a side station
const NDC_X = 0.42; // where a side piece lands horizontally on landscape
const DEFAULT_RADIUS = 2.2;
const PORTRAIT_FILL = 0.5; // portrait: piece diameter as a fraction of screen width
const PORTRAIT_MIN_SCALE = 0.45;
const VISIBLE_RANGE = 2; // pieces further than this (in stations) are hidden
// Pieces within this many stations of the camera are built as soon as a
// layout lands; the rest are built one per frame, nearest first, so a page
// of set pieces never costs one long frame.
const BUILD_AHEAD = VISIBLE_RANGE + 1;

// --- camera -----------------------------------------------------------------
const FOV = 45;
const TAN_HALF = Math.tan(MathUtils.degToRad(FOV / 2));
const NEAR = 0.1;
const FAR = 420;
const SCROLL_DAMP = 5.5;
const POINTER_DAMP = 4.5;
const PARALLAX_X = 0.35;
const PARALLAX_Y = 0.22;

// --- render budget ------------------------------------------------------------
// The DPR cap alone doesn't bound total pixels (a DPR-1 4K monitor is 8 Mpx),
// so the pixel ratio also respects a drawing-buffer budget per tier.
const MAX_PIXELS_HIGH = 3.5e6;
const MAX_PIXELS_LOW = 1.5e6;
const MIN_PIXEL_RATIO = 0.5;
// Transmissive glass re-renders the opaque scene; half resolution is plenty
// behind rough, attenuated glass.
const TRANSMISSION_SCALE = 0.5;

// --- atmosphere -------------------------------------------------------------
// exp(-(d * dist)^2): ~0.95 at the focused piece, ~0.6 one station out,
// ~0.25 two out, effectively gone at three.
const FOG_DENSITY = 0.026;
const EXPOSURE = 1.05;
// RoomEnvironment's ceiling panel (emissive ×100) is the brightest thing
// every upward-facing reflective surface sees; it stays neutral but dimmed.
// Reflection strength is otherwise set per material (envMapIntensity): every
// piece passes ctx.envMap explicitly, and three only applies
// scene.environmentIntensity to materials whose envMap is null.
const TOP_LIGHT = 0.35;
const PORTRAIT_BLOOM = 0.55; // portrait: the piece sits behind the copy

// --- warp / intro / drag ----------------------------------------------------
const WARP_ATTACK = 0.25;
const WARP_TOTAL = 0.9;
const WARP_FOV = 14;
const WARP_PUSH = 4;
const WARP_BLOOM = 0.6;
const INTRO_DURATION = 2.4;
const INTRO_RISE = 44;
const INTRO_BACK = 28;
const INTRO_FOV = 10;
const GRAB_YAW = 0.006; // rad per px
const GRAB_PITCH = 0.004; // rad per px
const PITCH_LIMIT = 0.6;
const GRAB_DECAY = 3;
const MAX_DT = 0.05;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

/** Vertical rhythm of the station chain — a slow wave, never a zigzag. */
function wave(k) {
  return Math.sin(k * 1.15) * 1.2;
}

/** 0 → 1 → 0 route-change pulse: fast attack, eased release. */
function warpPulse(t) {
  if (t <= 0) return 0;
  if (t < WARP_ATTACK) return easeOutCubic(t / WARP_ATTACK);
  if (t >= WARP_TOTAL) return 0;
  return 1 - easeInOutCubic((t - WARP_ATTACK) / (WARP_TOTAL - WARP_ATTACK));
}

function nowMs() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function devicePixelRatio() {
  return typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
}

function normalizeSide(side) {
  return side > 0 ? 1 : side < 0 ? -1 : 0;
}

// Optional per-station placement (see README "Station placement"): where the
// piece lands in the frame on landscape viewports. x = |NDC x| for side
// pieces, lift = NDC y (+ up), size = fill multiplier. Clamped so a stray
// DOM attribute can never throw the camera somewhere absurd.
function normalizePlacement(station, out) {
  const x = station && Number(station.x);
  const lift = station && Number(station.lift);
  const size = station && Number(station.size);
  out.x = Number.isFinite(x) ? clamp(x, 0, 0.8) : NDC_X;
  out.lift = Number.isFinite(lift) ? clamp(lift, -0.6, 0.6) : 0;
  out.size = Number.isFinite(size) ? clamp(size, 0.35, 1.4) : 1;
  return out;
}

function normalizeKey(station) {
  return station && typeof station.key === 'string' ? station.key : 'drift';
}

function hasPiece(key) {
  return Object.prototype.hasOwnProperty.call(PIECES, key);
}

// Give the neutral RoomEnvironment a faint brand cast so reflective pieces
// pick up violet/mauve highlights instead of grey studio light. In three r186
// the area lights are emissive-only Lambert panels (black colour, white
// emissive × intensity — RoomEnvironment's createAreaLightMaterial); older
// builds used MeshBasicMaterial with the intensity in the colour. Both are
// handled.
function tintRoom(room) {
  const white = new Color(palette.white);
  const wall = white.clone().lerp(new Color(palette.mauve2), 0.3);
  const left = white.clone().lerp(new Color(palette.mauve2), 0.45);
  const right = white.clone().lerp(new Color(palette.mauveMagic), 0.35);
  const front = white.clone().lerp(new Color(palette.mauve), 0.2);
  room.traverse((obj) => {
    const mat = obj.material;
    if (!mat || !obj.isMesh || obj.isInstancedMesh) return;
    const lambertPanel = mat.isMeshLambertMaterial && mat.emissiveIntensity > 1;
    if (lambertPanel || mat.isMeshBasicMaterial) {
      if (obj.position.y > 19) {
        // The ceiling light: neutral, dimmed.
        if (lambertPanel) mat.emissiveIntensity *= TOP_LIGHT;
        else mat.color.multiplyScalar(TOP_LIGHT);
        return;
      }
      const c = lambertPanel ? mat.emissive : mat.color;
      c.multiply(obj.position.x < -10 ? left : obj.position.x > 10 ? right : front);
    } else if (mat.isMeshStandardMaterial && mat.side === BackSide) {
      mat.color.copy(wall);
    }
  });
}

/**
 * Create the Signal World on a canvas.
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   quality?: 'high' | 'low',
 *   onContextLost?: () => void,
 *   onReady?: () => void,
 * }} options
 */
export async function createSignalWorld({ canvas, quality = 'high', onContextLost, onReady } = {}) {
  if (!canvas) throw new Error('createSignalWorld: a canvas is required');
  const high = quality !== 'low';
  const q = high ? 'high' : 'low';

  // --- renderer -------------------------------------------------------------
  // Everything 3D renders into the composer's own MSAA target; the canvas
  // only ever receives OutputPass's full-screen triangle, so its default
  // framebuffer needs no multisampling and no depth buffer. A context the
  // browser could only provide with a major performance caveat (software
  // rendering, blocklisted GPU) makes this throw, and the host falls back to
  // the CSS backdrop.
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    depth: false,
    stencil: false,
    alpha: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.transmissionResolutionScale = TRANSMISSION_SCALE;
  renderer.setClearColor(palette.void, 1);

  const prCap = high ? 1.75 : 1.25;
  const maxPixels = high ? MAX_PIXELS_HIGH : MAX_PIXELS_LOW;
  const pixelRatioFor = (w, h) =>
    Math.max(MIN_PIXEL_RATIO, Math.min(devicePixelRatio(), prCap, Math.sqrt(maxPixels / Math.max(1, w * h))));

  const fallbackW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const fallbackH = typeof window !== 'undefined' ? window.innerHeight : 720;
  let width = Math.max(1, Math.round(canvas.clientWidth || fallbackW || 1280));
  let height = Math.max(1, Math.round(canvas.clientHeight || fallbackH || 720));
  let pixelRatio = pixelRatioFor(width, height);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);

  // --- scene, fog, environment ---------------------------------------------
  const scene = new Scene();
  scene.background = new Color(palette.void);
  scene.fog = new FogExp2(palette.void, FOG_DENSITY);

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  tintRoom(room);
  const envTarget = pmrem.fromScene(room, 0.04);
  // RoomEnvironment.dispose() frees geometries and materials but not its
  // instanced boxes' per-instance buffers.
  room.traverse((obj) => {
    if (obj.isInstancedMesh) obj.dispose();
  });
  room.dispose();
  pmrem.dispose();
  const envMap = envTarget.texture;
  scene.environment = envMap;

  // --- lights ---------------------------------------------------------------
  const hemi = new HemisphereLight(palette.mauve2, palette.indigo, 0.35);
  scene.add(hemi);

  // Key: upper-left-front, a violet-tinged white. Directional, so its
  // direction is identical at every station.
  const keyColor = new Color(palette.white).lerp(new Color(palette.mauve2), 0.22);
  const key = new DirectionalLight(keyColor, 1.6);
  key.position.set(-6, 9, 8);
  scene.add(key);

  // Rims: follow the focused station, sitting behind the piece on both sides.
  const rimA = new PointLight(palette.purpleX11, 46, 34, 2);
  const rimB = new PointLight(palette.hyperMagenta, 34, 34, 2);
  scene.add(rimA);
  scene.add(rimB);

  // --- camera ---------------------------------------------------------------
  const camera = new PerspectiveCamera(FOV, width / height, NEAR, FAR);
  camera.position.set(0, 0.6, 10);
  scene.add(camera);

  // --- post -----------------------------------------------------------------
  // MSAA lives on the composer's target (the only place the scene is drawn).
  const composerTarget = new WebGLRenderTarget(
    Math.round(width * pixelRatio),
    Math.round(height * pixelRatio),
    { type: HalfFloatType, samples: high ? 4 : 0 },
  );
  composerTarget.texture.name = 'SignalWorld.composer';
  const composer = new EffectComposer(renderer, composerTarget);
  const renderPass = new RenderPass(scene, camera);
  const bloomBase = high ? 0.8 : 0.68;
  const bloom = new UnrealBloomPass(new Vector2(width, height), bloomBase, 0.55, 0.22);
  // Scrub the bloom's input: a single NaN/Inf pixel from any piece would
  // otherwise be blurred across every mip and black out the whole frame.
  // max-then-min maps NaN → 0 on IEEE minNum/maxNum hardware (D3D11, Metal,
  // desktop GL); isnan() is not used because shader compilers (fxc) fold it
  // away. Costs nothing extra — it rides on the existing high-pass.
  const highPass = bloom.materialHighPassFilter;
  if (highPass) {
    highPass.fragmentShader = highPass.fragmentShader.replace(
      'vec4 texel = texture2D( tDiffuse, vUv );',
      'vec4 texel = min( max( texture2D( tDiffuse, vUv ), vec4( 0.0 ) ), vec4( 64.0 ) );',
    );
    highPass.needsUpdate = true;
  }
  if (!high) {
    // Low quality: bloom at half resolution.
    const setBloomSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w, h) =>
      setBloomSize(Math.max(2, Math.round(w * 0.5)), Math.max(2, Math.round(h * 0.5)));
  }
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(outputPass);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);

  // --- the global field -----------------------------------------------------
  const field = createSignalField({ THREE, quality: q, palette });
  scene.add(field.object);
  const fieldState = { time: 0, dt: 0, warp: 0, cameraZ: 0 };

  // --- stations -------------------------------------------------------------
  // One context object for the life of this world (pieces may key shared,
  // per-world resources on it — the mark shares its extruded solid).
  const pieceCtx = { THREE, quality: q, envMap, palette };
  /** @type {Array<{ key: string, side: number, piece: any, anchor: Group|null, pos: Vector3, scale: number, grab: {x:number,y:number}, vel: {x:number,y:number}, broken: boolean, pending: boolean }>} */
  let entries = [];
  let camPts = [];
  let lookPts = [];
  let camCurve = null;
  let lookCurve = null;
  let portrait = width / height < 1;
  const anchor0 = new Vector3(0, wave(0), 0); // P_0 (also when there are no stations)
  let pendingStations = null;
  let pendingBuilds = 0;
  let hadStations = false;
  let stationsAppliedAt = -Infinity;

  // --- motion state ---------------------------------------------------------
  let s = 0; // displayed (smoothed) station coordinate
  let sTarget = 0;
  let sVel = 0;
  let bank = 0;
  let snapScroll = false;
  const pointerTarget = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };
  const drag = { active: false, index: -1, last: 0 };

  let warpActive = false;
  let warpT = 0;

  let introActive = false;
  let introT = 0;
  let introResolve = null;
  let introPromise = null;
  let introTimer = 0;

  let time = 0;
  let raf = 0;
  let running = false;
  let paused = false;
  let lost = false;
  let disposed = false;
  let ready = false;
  let lastFrame = 0;
  let readyFired = false;

  // Preallocated scratch for the frame loop.
  const rigCam = new Vector3();
  const rigLook = new Vector3();
  const camPos = new Vector3();
  const lookPos = new Vector3();
  const ahead = new Vector3();
  const dir = new Vector3();
  const focusPoint = new Vector3();
  const introStart = new Vector3();
  const introCtrl = new Vector3();
  const introLook = new Vector3();
  const zeroGrab = { x: 0, y: 0 };

  // One state object, reused for every piece, every frame.
  const state = { time: 0, dt: 0, focus: 0, local: 0, pointer, warp: 0, grab: zeroGrab };

  // --- layout ---------------------------------------------------------------
  function effectiveSide(k) {
    const e = entries[k];
    return portrait || !e ? 0 : e.side;
  }

  function radiusOf(e) {
    const r = e && e.piece && Number.isFinite(e.piece.radius) ? e.piece.radius : DEFAULT_RADIUS;
    return clamp(r, 1.2, 4.5);
  }

  // Camera + look target that frame a piece of radius r at P. Returns the
  // scale for the station's anchor (1 except on portrait).
  function framing(P, side, r, aspect, outCam, outLook, place) {
    if (portrait) {
      // Centered, pushed back and a little low: a quiet backdrop under the
      // text column, about half the screen width. Distance is capped by the
      // station spacing (the camera must still clear the previous piece),
      // so on narrow phones the anchor shrinks the piece the rest of the way.
      const a = Math.max(aspect, 0.3);
      const base = (r / (0.5 * TAN_HALF)) * 1.15;
      const d = clamp(Math.max(r / (PORTRAIT_FILL * TAN_HALF * a), base), 6, 13);
      outCam.set(P.x, P.y + 0.9, P.z + d);
      outLook.set(P.x, P.y + 1.2, P.z);
      return clamp((PORTRAIT_FILL * d * TAN_HALF * a) / r, PORTRAIT_MIN_SCALE, 1);
    }
    // Piece diameter ≈ half the viewport height; narrower screens back off
    // so the piece still fits its half of the frame.
    const size = place ? place.size : 1;
    const ndcX = place ? place.x : NDC_X;
    const lift = place ? place.lift : 0;
    const fill = 0.5 * size * Math.min(1, aspect / 1.45);
    const d = clamp(r / (fill * TAN_HALF), 6, 17);
    // Offsets that put P at NDC (side * ndcX, lift): the camera slides the
    // other way and keeps looking straight ahead.
    const offset = side * ndcX * d * TAN_HALF * aspect;
    const rise = lift * d * TAN_HALF;
    outCam.set(P.x - offset, P.y + 0.55 - rise, P.z + d);
    outLook.set(outCam.x, P.y + 0.15 - rise, P.z);
    return 1;
  }

  function relayout() {
    const aspect = width / height;
    portrait = aspect < 1;
    const count = Math.max(1, entries.length);
    const m = count * 2 - 1;
    if (camPts.length !== m) {
      camPts = Array.from({ length: m }, () => new Vector3());
      lookPts = Array.from({ length: m }, () => new Vector3());
      camCurve = m >= 2 ? new CatmullRomCurve3(camPts, false, 'centripetal') : null;
      lookCurve = m >= 2 ? new CatmullRomCurve3(lookPts, false, 'centripetal') : null;
    }

    // Framings at even indices.
    for (let k = 0; k < count; k++) {
      const e = entries[k];
      const side = effectiveSide(k);
      const P = e ? e.pos : anchor0;
      P.set(side * SIDE_X, wave(k), -k * SPACING);
      if (k === 0 && e) anchor0.copy(P);
      const scale = framing(P, side, radiusOf(e), aspect, camPts[k * 2], lookPts[k * 2], e);
      if (e) e.scale = scale;
      if (e && e.anchor) {
        e.anchor.position.copy(P);
        e.anchor.scale.setScalar(scale);
      }
    }

    // Pass points at odd indices: where the camera crosses piece k's depth on
    // its way to k + 1. Side pieces are passed on the inside, centered ones
    // are cleared from above; empty ('drift') stations are flown straight.
    for (let k = 0; k < count - 1; k++) {
      const e = entries[k];
      const pass = camPts[k * 2 + 1];
      const passLook = lookPts[k * 2 + 1];
      passLook.lerpVectors(lookPts[k * 2], lookPts[k * 2 + 2], 0.5);
      if (!e || !e.piece) {
        pass.lerpVectors(camPts[k * 2], camPts[k * 2 + 2], 0.5);
        continue;
      }
      const side = effectiveSide(k);
      const r = radiusOf(e) * e.scale;
      const P = e.pos;
      if (side !== 0) {
        pass.set(P.x - side * (r + 1.5), P.y + 0.7, P.z);
      } else {
        const rise = r + 1.3;
        pass.set(P.x, P.y + rise, P.z);
        passLook.y += rise * 0.4;
      }
    }
  }

  // Camera rig at station coordinate sv (no warp / intro / parallax).
  function sampleRig(sv, outCam, outLook) {
    if (!camCurve) {
      outCam.copy(camPts[0]);
      if (outLook) outLook.copy(lookPts[0]);
      return;
    }
    const n = (camPts.length + 1) / 2;
    const t = clamp(sv / (n - 1), 0, 1);
    camCurve.getPoint(t, outCam);
    if (outLook) lookCurve.getPoint(t, outLook);
  }

  // Start linking new pieces' programs now (in parallel where the driver
  // allows) rather than on the frame they first come into range. compile()
  // walks the whole scene, hidden anchors included.
  function compileSoon() {
    try {
      renderer.compileAsync(scene, camera).catch(() => {});
    } catch {
      /* the first render compiles them instead */
    }
  }

  // --- piece lifecycle ------------------------------------------------------
  function disposeEntry(e) {
    if (e.pending) {
      e.pending = false;
      pendingBuilds--;
    }
    if (!e.piece) return;
    if (e.anchor) {
      e.anchor.remove(e.piece.object);
      scene.remove(e.anchor);
    }
    try {
      e.piece.dispose();
    } catch (err) {
      console.warn(`[SignalWorld] piece "${e.key}" failed to dispose`, err);
    }
    e.piece = null;
    e.anchor = null;
  }

  function disposeAllPieces() {
    for (let i = 0; i < entries.length; i++) disposeEntry(entries[i]);
  }

  function makeEntry(key, side, station) {
    const pending = hasPiece(key);
    if (pending) pendingBuilds++;
    return normalizePlacement(station, {
      key,
      side,
      piece: null,
      anchor: null,
      pos: new Vector3(),
      scale: 1,
      grab: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      broken: false,
      pending,
    });
  }

  /** Build a pending entry's piece. True when a piece was added to the scene. */
  function buildEntry(e) {
    if (!e.pending) return false;
    e.pending = false;
    pendingBuilds--;
    try {
      const piece = PIECES[e.key](pieceCtx);
      if (piece && piece.object) {
        // An engine-owned anchor carries the station position, so pieces are
        // free to animate their own object's transform.
        const anchor = new Group();
        anchor.name = `station:${e.key}`;
        anchor.add(piece.object);
        anchor.visible = false;
        scene.add(anchor);
        e.piece = piece;
        e.anchor = anchor;
        return true;
      }
    } catch (err) {
      console.warn(`[SignalWorld] piece "${e.key}" failed to build`, err);
    }
    return false;
  }

  // One deferred build per frame: the pending station nearest the camera.
  // Its framing only moves curve points around its own station, far from
  // where the camera is flying, so the relayout never jolts the view.
  function buildNextPending() {
    let best = -1;
    let bestD = Infinity;
    for (let k = 0; k < entries.length; k++) {
      if (!entries[k].pending) continue;
      const d = Math.abs(k - s);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best < 0) {
      pendingBuilds = 0;
      return;
    }
    if (buildEntry(entries[best])) {
      relayout();
      compileSoon();
    }
  }

  function applyStations(list) {
    const next = Array.isArray(list) ? list : [];
    const sameKeys =
      next.length === entries.length && next.every((st, i) => normalizeKey(st) === entries[i].key);
    if (sameKeys) {
      for (let i = 0; i < next.length; i++) {
        entries[i].side = normalizeSide(next[i] && next[i].side);
        normalizePlacement(next[i], entries[i]);
      }
    } else {
      // Pool the built pieces by key (in order), so set pieces that recur
      // across pages — the mark, the ledger, the tunnel… — carry over to the
      // new layout instead of being torn down and rebuilt under the warp.
      const pool = new Map();
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.piece || e.broken) {
          disposeEntry(e);
          continue;
        }
        const bucket = pool.get(e.key);
        if (bucket) bucket.push(e);
        else pool.set(e.key, [e]);
      }
      entries = next.map((station) => {
        const key = normalizeKey(station);
        const side = normalizeSide(station && station.side);
        const bucket = pool.get(key);
        const reused = bucket && bucket.length > 0 ? bucket.shift() : null;
        if (!reused) return makeEntry(key, side, station);
        reused.side = side;
        normalizePlacement(station, reused);
        reused.grab.x = 0;
        reused.grab.y = 0;
        reused.vel.x = 0;
        reused.vel.y = 0;
        return reused;
      });
      pool.forEach((bucket) => bucket.forEach(disposeEntry));
      drag.active = false;
      drag.index = -1;
    }

    const maxS = Math.max(0, entries.length - 1);
    // First layout, or a route change under cover of the warp: cut straight
    // to the target instead of flying there.
    const cut = !hadStations || warpActive;
    const target = clamp(sTarget, 0, maxS);
    const from = cut ? target : clamp(s, 0, maxS);

    // Build what the camera can reach soon; the rest follows a frame at a time.
    const lo = Math.min(from, target) - BUILD_AHEAD;
    const hi = Math.max(from, target) + BUILD_AHEAD;
    let built = false;
    for (let k = 0; k < entries.length; k++) {
      if (entries[k].pending && k >= lo && k <= hi) built = buildEntry(entries[k]) || built;
    }
    relayout();
    if (built) compileSoon();

    s = from;
    if (cut) snapScroll = warpActive;
    hadStations = true;
    stationsAppliedAt = time;
  }

  // --- per-frame ------------------------------------------------------------
  function updateGrabInertia(dt) {
    const decay = Math.exp(-dt * GRAB_DECAY);
    const settle = Math.exp(-dt * 1.4);
    for (let k = 0; k < entries.length; k++) {
      if (drag.active && drag.index === k) continue;
      const e = entries[k];
      const g = e.grab;
      const v = e.vel;
      if (v.x !== 0 || v.y !== 0) {
        g.x += v.x * dt;
        g.y = clamp(g.y + v.y * dt, -PITCH_LIMIT, PITCH_LIMIT);
        v.x *= decay;
        v.y *= decay;
        if (Math.abs(v.x) < 1e-3) v.x = 0;
        if (Math.abs(v.y) < 1e-3) v.y = 0;
      }
      // Once released, pitch eases home so the hero ends upright; yaw keeps
      // wherever the spin left it.
      if (g.y !== 0 && Math.abs(v.y) < 0.05) {
        g.y *= settle;
        if (Math.abs(g.y) < 1e-4) g.y = 0;
      }
    }
  }

  function finishIntro() {
    introActive = false;
    if (introTimer) {
      clearTimeout(introTimer);
      introTimer = 0;
    }
    const resolve = introResolve;
    introResolve = null;
    introPromise = null;
    if (resolve) resolve();
  }

  function step(dt) {
    time += dt;

    // Pointer.
    const kp = 1 - Math.exp(-dt * POINTER_DAMP);
    pointer.x += (pointerTarget.x - pointer.x) * kp;
    pointer.y += (pointerTarget.y - pointer.y) * kp;

    // Warp pulse (and a station swap deferred to its peak).
    let w = 0;
    if (warpActive) {
      warpT += dt;
      if (pendingStations && warpT >= WARP_ATTACK) {
        const list = pendingStations;
        pendingStations = null;
        applyStations(list);
      }
      if (warpT >= WARP_TOTAL) {
        warpActive = false;
        snapScroll = false;
        if (pendingStations) {
          const list = pendingStations;
          pendingStations = null;
          applyStations(list);
        }
      } else {
        w = warpPulse(warpT);
      }
    }

    // Pieces still waiting to be built: one per frame, nearest first.
    if (pendingBuilds > 0 && !pendingStations) buildNextPending();

    // Scroll.
    const maxS = Math.max(0, entries.length - 1);
    const prevS = s;
    const target = clamp(sTarget, 0, maxS);
    if (introActive) {
      s = 0;
    } else if (pendingStations) {
      // Hold the old world still until the warp peak swaps it out.
    } else if (snapScroll) {
      s = target;
    } else {
      s += (target - s) * (1 - Math.exp(-dt * SCROLL_DAMP));
      if (Math.abs(target - s) < 1e-4) s = target;
    }
    if (s > maxS) s = maxS;
    const vInst = dt > 0 ? (s - prevS) / dt : 0;
    sVel += (clamp(vInst, -8, 8) - sVel) * (1 - Math.exp(-dt * 6));

    // Camera rig.
    sampleRig(s, rigCam, rigLook);

    // Bank gently into lateral motion — proportional to actual travel speed,
    // so the horizon is level whenever the camera is at rest.
    let bankTarget = 0;
    if (camCurve && Math.abs(sVel) > 1e-3) {
      sampleRig(s + 0.02, ahead, null);
      const dz = Math.abs(ahead.z - rigCam.z);
      const slope = dz > 1e-4 ? (ahead.x - rigCam.x) / dz : 0;
      bankTarget = clamp(-slope * sVel * 0.05, -0.05, 0.05);
    }
    bank += (bankTarget - bank) * (1 - Math.exp(-dt * 4));

    let fovExtra = 0;
    if (introActive) {
      introT += dt;
      const x = clamp(introT / INTRO_DURATION, 0, 1);
      const e = easeInOutCubic(x);
      // High above station 0, looking down into the pit; a quadratic swoop
      // that falls steeply first and levels out into the framing.
      introStart.set(anchor0.x, anchor0.y + INTRO_RISE, anchor0.z + INTRO_BACK);
      introCtrl.set(rigCam.x, rigCam.y + 12, rigCam.z + 16);
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      camPos.set(
        introStart.x * a + introCtrl.x * b + rigCam.x * c,
        introStart.y * a + introCtrl.y * b + rigCam.y * c,
        introStart.z * a + introCtrl.z * b + rigCam.z * c,
      );
      introLook.set(anchor0.x, anchor0.y - 8, anchor0.z - 4);
      lookPos.lerpVectors(introLook, rigLook, easeInOutCubic(Math.min(1, x * 1.08)));
      fovExtra = INTRO_FOV * (1 - e);
      if (x >= 1) finishIntro();
    } else {
      camPos.copy(rigCam);
      lookPos.copy(rigLook);
    }

    // Pointer parallax.
    camPos.x += pointer.x * PARALLAX_X;
    camPos.y += pointer.y * PARALLAX_Y;

    // Warp punch forward along the view direction.
    if (w > 0) {
      dir.subVectors(lookPos, camPos).normalize();
      camPos.addScaledVector(dir, WARP_PUSH * w);
      lookPos.addScaledVector(dir, WARP_PUSH * w);
    }

    camera.position.copy(camPos);
    camera.lookAt(lookPos);
    if (bank !== 0) camera.rotateZ(bank);
    const fov = FOV + fovExtra + WARP_FOV * w;
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // Rim lights around the focused piece, relative to the look target.
    const n = entries.length;
    if (n > 0) {
      const k0 = Math.min(Math.floor(s), n - 1);
      const k1 = Math.min(k0 + 1, n - 1);
      focusPoint.lerpVectors(entries[k0].pos, entries[k1].pos, s - k0);
    } else {
      focusPoint.copy(anchor0);
    }
    rimA.position.set(focusPoint.x + 2.7, lookPos.y + 2.6, lookPos.z - 3);
    rimB.position.set(focusPoint.x - 2.9, lookPos.y - 1.3, lookPos.z - 2.4);

    // Pieces.
    updateGrabInertia(dt);
    state.time = time;
    state.dt = dt;
    state.warp = w;
    for (let k = 0; k < n; k++) {
      const e = entries[k];
      if (!e.piece || !e.anchor) continue;
      const local = s - k;
      const dist = local < 0 ? -local : local;
      if (dist > VISIBLE_RANGE || e.broken) {
        if (e.anchor.visible) e.anchor.visible = false;
        continue;
      }
      e.anchor.visible = true;
      state.focus = dist < 1 ? 1 - dist : 0;
      state.local = local;
      state.grab = e.grab;
      try {
        e.piece.update(state);
      } catch (err) {
        e.broken = true;
        e.anchor.visible = false;
        console.warn(`[SignalWorld] piece "${e.key}" failed to update; hiding it`, err);
      }
    }
    state.grab = zeroGrab;

    // Field + post. Portrait puts the piece right behind the copy, so its
    // glow stays quieter there.
    fieldState.time = time;
    fieldState.dt = dt;
    fieldState.warp = w;
    fieldState.cameraZ = camera.position.z;
    field.update(fieldState);
    bloom.strength = (portrait ? bloomBase * PORTRAIT_BLOOM : bloomBase) + WARP_BLOOM * w;
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    let dt = (now - lastFrame) / 1000;
    lastFrame = now;
    if (!(dt > 0)) dt = 0;
    else if (dt > MAX_DT) dt = MAX_DT;
    step(dt);
    composer.render(dt);
    if (!ready) {
      ready = true;
      if (!readyFired) {
        readyFired = true;
        if (typeof onReady === 'function') {
          try {
            onReady();
          } catch (err) {
            console.warn('[SignalWorld] onReady threw', err);
          }
        }
      }
    }
  }

  function start() {
    if (running || paused || lost || disposed) return;
    if (typeof requestAnimationFrame !== 'function') return;
    running = true;
    lastFrame = nowMs();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
    raf = 0;
  }

  // --- context loss ---------------------------------------------------------
  function handleContextLost(event) {
    event.preventDefault();
    lost = true;
    stop();
    finishIntro();
    if (typeof onContextLost === 'function') {
      try {
        onContextLost();
      } catch (err) {
        console.warn('[SignalWorld] onContextLost threw', err);
      }
    }
  }
  canvas.addEventListener('webglcontextlost', handleContextLost, false);

  // --- initial layout + warm-up ---------------------------------------------
  relayout();
  sampleRig(0, camera.position, lookPos);
  camera.lookAt(lookPos);
  try {
    // Compile the field + environment programs before the first frame (uses
    // KHR_parallel_shader_compile where available); never wait forever.
    await Promise.race([
      renderer.compileAsync(scene, camera),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    /* compile errors surface on the first render instead */
  }

  // --- public API -----------------------------------------------------------
  const world = {
    get ready() {
      return ready;
    },

    /** @param {Array<{ key: string, side?: -1|0|1 }>} stations */
    setStations(stations) {
      if (disposed) return;
      // During the warp's attack the swap waits for the peak, where the
      // streaks and the FOV punch hide the cut.
      if (warpActive && warpT < WARP_ATTACK) {
        pendingStations = Array.isArray(stations) ? stations.slice() : [];
        return;
      }
      pendingStations = null;
      applyStations(stations);
    },

    setScroll(value) {
      sTarget = Number.isFinite(value) ? value : 0;
    },

    setPointer(nx, ny) {
      pointerTarget.x = Number.isFinite(nx) ? clamp(nx, -1, 1) : 0;
      pointerTarget.y = Number.isFinite(ny) ? clamp(ny, -1, 1) : 0;
    },

    grab(dxPx, dyPx) {
      if (disposed || entries.length === 0) return;
      const now = nowMs();
      if (!drag.active) {
        // Grab the piece of the station nearest the camera.
        const n = entries.length;
        const k = clamp(Math.round(s), 0, n - 1);
        let index = k;
        if (!entries[k].piece) {
          const alt = s >= k ? [k + 1, k - 1] : [k - 1, k + 1];
          for (let i = 0; i < alt.length; i++) {
            if (alt[i] >= 0 && alt[i] < n && entries[alt[i]].piece) {
              index = alt[i];
              break;
            }
          }
        }
        drag.active = true;
        drag.index = index;
        drag.last = now;
        entries[index].vel.x = 0;
        entries[index].vel.y = 0;
      }
      const e = entries[drag.index];
      if (!e) return;
      const ax = (Number(dxPx) || 0) * GRAB_YAW;
      const ay = (Number(dyPx) || 0) * GRAB_PITCH;
      e.grab.x += ax;
      e.grab.y = clamp(e.grab.y + ay, -PITCH_LIMIT, PITCH_LIMIT);
      const edt = Math.max((now - drag.last) / 1000, 1 / 240);
      drag.last = now;
      e.vel.x = clamp(e.vel.x * 0.5 + (ax / edt) * 0.5, -10, 10);
      e.vel.y = clamp(e.vel.y * 0.5 + (ay / edt) * 0.5, -6, 6);
    },

    release() {
      if (!drag.active) return;
      drag.active = false;
      const e = entries[drag.index];
      // Held still before letting go: no fling.
      if (e && nowMs() - drag.last > 90) {
        e.vel.x = 0;
        e.vel.y = 0;
      }
    },

    warp() {
      if (disposed) return;
      warpActive = true;
      warpT = 0;
      // Stations swapped in the same tick, just before warp(): follow the
      // scroll target exactly for the pulse so the camera never flies
      // backward through the new page.
      if (time - stationsAppliedAt < 0.15) snapScroll = true;
    },

    intro() {
      if (disposed || lost) return Promise.resolve();
      if (introPromise) return introPromise;
      introActive = true;
      introT = 0;
      introPromise = new Promise((resolve) => {
        introResolve = resolve;
      });
      // Never leave a caller hanging (paused tab, lost frames).
      introTimer = setTimeout(finishIntro, (INTRO_DURATION + 2.5) * 1000);
      return introPromise;
    },

    resize(w, h) {
      // Ignore zero/invalid sizes (a hidden or detached canvas) and keep
      // the last good layout.
      if (disposed || !(w > 0) || !(h > 0)) return;
      const W = Math.max(1, Math.round(w));
      const H = Math.max(1, Math.round(h));
      const pr = pixelRatioFor(W, H);
      if (pr !== pixelRatio) {
        pixelRatio = pr;
        renderer.setPixelRatio(pr);
        composer.setPixelRatio(pr);
      }
      width = W;
      height = H;
      renderer.setSize(W, H, false);
      composer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      relayout();
    },

    setPaused(value) {
      paused = !!value;
      if (paused) stop();
      else start();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      finishIntro();
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      pendingStations = null;
      disposeAllPieces();
      entries = [];
      pendingBuilds = 0;
      scene.remove(field.object);
      field.dispose();
      for (let i = 0; i < composer.passes.length; i++) composer.passes[i].dispose();
      // UnrealBloomPass.dispose() leaves its high-pass material (the one
      // patched above) behind.
      bloom.materialHighPassFilter?.dispose();
      composer.dispose(); // its two render targets + copy pass
      scene.environment = null;
      envTarget.dispose();
      renderer.dispose();
      // Hand the context back now rather than at GC: every marketing mount
      // makes a fresh canvas, and browsers cap live contexts. The
      // context-lost listener is already gone, so this never reads as a
      // failure.
      if (!lost) {
        try {
          renderer.forceContextLoss();
        } catch {
          /* WEBGL_lose_context unavailable */
        }
      }
    },
  };

  start();
  return world;
}
