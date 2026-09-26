// Ledger — "a ledger you can actually audit".
//
// A vertical helix of thin metal coins (a spiral staircase of credits), each
// edged with a faint violet rim light, slowly turning. Every cycle one coin
// drops in from above and lands on top (a grant) while the bottom coin peels
// off, drifts out and fades (a reveal); the stack then screws down one step so
// the helix keeps its height. The instance count never changes: instance slots
// are re-assigned by role each frame (stacked coins first, the two moving,
// fading coins last so their transparency sorts correctly). As the chapter
// approaches (local −1 → 0) the helix unwinds upward from a compressed pile.
import { rampColor } from '../palette.js';

const STEP_Y = 0.11;
const STEP_A = (22 * Math.PI) / 180;
const HELIX_R = 0.9;
const COIN_R = 0.55;
const CYCLE = 3.6; // seconds between grant/reveal events (a calm, audit-paced beat)
const LAND_AT = 0.42; // fraction of the cycle when the dropping coin lands
const SETTLE_FROM = 0.5; // stack screws down one step after the landing
const SETTLE_TO = 0.95;
const PEEL_FROM = 0.3;
const DROP_H = 0.95;
const COIN_TILT = 0.08; // coins bank slightly outward

// ── Small math helpers (allocation-free) ────────────────────────────────────
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

function bezierCoord(t, p1, p2) {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}
/** The design language's motion ease, cubic-bezier(.2,.8,.2,1). */
function easeBrand(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bezierCoord(t, 0.2, 0.2) - x;
    if (Math.abs(err) < 1e-5) break;
    const u = 1 - t;
    t -= err / (0.6 * u * u + 2.4 * t * t); // dx/dt for x1 = x2 = 0.2
  }
  return bezierCoord(t, 0.8, 1);
}

/** Coin profile (bottom centre → out → up the edge → back in → top centre). */
function coinProfile(THREE) {
  const R = COIN_R;
  const HT = 0.03; // half thickness at the raised rim
  const FACE = 0.021; // half thickness at the recessed face
  const IN = 0.42; // inner radius of the raised rim
  const pts = [
    [0, -FACE],
    [0.2, -FACE],
    [0.21, -FACE + 0.004],
    [0.23, -FACE + 0.004],
    [0.24, -FACE],
    [IN - 0.03, -FACE],
    [IN - 0.012, -FACE],
    [IN, -HT],
    [R - 0.035, -HT],
    [R - 0.012, -HT + 0.004],
    [R, -HT + 0.014],
    [R, HT - 0.014],
    [R - 0.012, HT - 0.004],
    [R - 0.035, HT],
    [IN, HT],
    [IN - 0.012, FACE],
    [IN - 0.03, FACE],
    [0.24, FACE],
    [0.23, FACE - 0.004],
    [0.21, FACE - 0.004],
    [0.2, FACE],
    [0, FACE],
  ];
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}

// ── Piece ──────────────────────────────────────────────────────────────────
export function createLedgerPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';
  const env = envMap || null;
  const col = (hex) => new THREE.Color(hex);

  const N = high ? 40 : 22;
  const STACKED = N - 2; // plus one dropping (grant) and one peeling (reveal)
  const SLOT_DROP = N - 2;
  const SLOT_PEEL = N - 1;

  const object = new THREE.Group();
  object.name = 'piece:ledger';
  const tilt = new THREE.Group(); // leans the helix toward the viewer
  const spin = new THREE.Group(); // turns the helix about its axis
  object.add(tilt);
  tilt.add(spin);

  // ── Coins ──
  const coinGeo = new THREE.LatheGeometry(coinProfile(THREE), high ? 48 : 28);
  const fade = new Float32Array(N).fill(1);
  const fadeAttr = new THREE.InstancedBufferAttribute(fade, 1);
  fadeAttr.setUsage(THREE.DynamicDrawUsage);
  coinGeo.setAttribute('aFade', fadeAttr);

  // Satin metal, not mirror chrome: forty stacked coins all catching the
  // studio's HDR panels would bloom into a white cloud behind the chapter
  // copy. Keep envMapIntensity at 0.2 or below — the rims and the key/rim
  // lights carry the read.
  const coinMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.55,
    roughness: 0.4,
    clearcoat: 0.4,
    clearcoatRoughness: 0.14,
    envMap: env,
    envMapIntensity: 0.15,
    transparent: true,
  });
  // Per-instance fade (the grant fades in, the reveal fades out).
  coinMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aFade;\nvarying float vFade;',
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vFade;');
  };
  coinMat.customProgramCacheKey = () => 'datapit-ledger-coin-fade';

  const coins = new THREE.InstancedMesh(coinGeo, coinMat, N);
  coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coins.frustumCulled = false;
  spin.add(coins);

  // ── Rim lights (thin tori hugging each coin edge) ──
  const rimGeo = new THREE.TorusGeometry(COIN_R + 0.002, 0.007, 4, high ? 64 : 36);
  rimGeo.rotateX(Math.PI / 2);
  const rimMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const rims = new THREE.InstancedMesh(rimGeo, rimMat, N);
  rims.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rims.frustumCulled = false;
  rims.renderOrder = 1; // after the (transparent-pass) coins so depth occludes it
  spin.add(rims);

  // ── Spine + base ring (quiet structure) ──
  const spineMat = new THREE.MeshBasicMaterial({
    color: col(palette.royalViolet),
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 8, 1, true), spineMat);
  spine.renderOrder = 1;
  spin.add(spine);
  const baseMat = new THREE.MeshBasicMaterial({
    color: col(palette.neonViolet),
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const base = new THREE.Mesh(
    new THREE.TorusGeometry(HELIX_R + COIN_R + 0.12, 0.006, 6, high ? 128 : 64),
    baseMat,
  );
  base.rotation.x = Math.PI / 2;
  base.renderOrder = 1;
  spin.add(base);

  // ── Colors ──
  const tint = col(palette.mauve2);
  const rimColor = col(palette.neonViolet);
  const tmpColor = new THREE.Color();
  const coinColorFor = (q) => {
    // Walk the ramp coin by coin; the walk reverses every N−1 coins so the
    // stack always shows one smooth sweep of the brand gradient.
    const t = 0.5 - 0.5 * Math.cos((q * Math.PI) / (N - 1));
    return tmpColor.setHex(rampColor(t)).lerp(tint, 0.18);
  };

  // ── Per-frame state (preallocated) ──
  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'YXZ';
  let lastCycle = null;
  let spinAngle = 0;
  let px = 0;
  let py = 0;

  // Helix geometry for the current unwind amount (set each frame).
  let stepY = STEP_Y;
  let stepA = STEP_A;
  let radius = HELIX_R;
  let yCenter = 0;
  let twist = 0;

  const helixY = (s) => yCenter + (s - (N - 1) / 2) * stepY;
  const helixA = (s) => twist + s * stepA;

  /** Place `dummy` on the helix at slot position s, with optional overrides. */
  function placeOnHelix(s, dy, da, dr, dTilt) {
    const a = helixA(s) + da;
    const r = radius + dr;
    dummy.position.set(Math.cos(a) * r, helixY(s) + dy, Math.sin(a) * r);
    dummy.rotation.set(-COIN_TILT + dTilt, -a - Math.PI / 2, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
  }

  function writeSlot(slot, fadeValue, rimIntensity) {
    coins.setMatrixAt(slot, dummy.matrix);
    rims.setMatrixAt(slot, dummy.matrix);
    fade[slot] = fadeValue;
    tmpColor.copy(rimColor).multiplyScalar(rimIntensity * fadeValue);
    rims.setColorAt(slot, tmpColor);
  }

  function update(state) {
    const time = state.time || 0;
    const dt = state.dt || 0;
    const focus = clamp01(state.focus == null ? 1 : state.focus);
    const local = state.local || 0;
    const warp = state.warp || 0;
    const pointer = state.pointer;
    const grab = state.grab;

    px = damp(px, pointer ? pointer.x : 0, 2.5, dt);
    py = damp(py, pointer ? pointer.y : 0, 2.5, dt);
    const gx = grab ? grab.x : 0;
    const gy = grab ? Math.max(-0.6, Math.min(0.6, grab.y)) : 0;

    spinAngle += dt * (0.16 + warp * 2.2);
    spin.rotation.y = spinAngle + gx;
    tilt.rotation.set(0.3 - py * 0.12 + gy, 0, Math.sin(time * 0.2) * 0.04 - px * 0.08);
    tilt.position.z = -warp * 0.4;
    tilt.position.y = Math.sin(time * 0.45) * 0.05;

    // Unwind from a compressed pile as the chapter approaches.
    const p = smooth(-1, -0.05, local);
    stepY = lerp(0.018, STEP_Y, p);
    stepA = lerp(0.02, STEP_A, p);
    radius = lerp(0.35, HELIX_R, p);
    yCenter = -(1 - p) * STEP_Y * N * 0.32;
    twist = -(1 - p) * 2.4;

    const cycleF = time / CYCLE;
    const c = Math.floor(cycleF);
    const f = cycleF - c;
    const settle = easeBrand((f - SETTLE_FROM) / (SETTLE_TO - SETTLE_FROM));
    const rimBase = 0.35 + 0.25 * focus;

    // Coin identities move one slot per cycle: refresh colors on change.
    if (c !== lastCycle) {
      lastCycle = c;
      for (let k = 1; k <= STACKED; k++) coins.setColorAt(k - 1, coinColorFor(c - k));
      coins.setColorAt(SLOT_DROP, coinColorFor(c));
      coins.setColorAt(SLOT_PEEL, coinColorFor(c - (N - 1)));
      if (coins.instanceColor) coins.instanceColor.needsUpdate = true;
    }

    // Stacked coins: depth k = 1 (top) … N−2, slot position N−1−k, settling down.
    for (let k = 1; k <= STACKED; k++) {
      placeOnHelix(N - 1 - k - settle, 0, 0, 0, 0);
      writeSlot(k - 1, 1, rimBase);
    }

    // Grant: drops from above, fades in, spins down, lands with a small bounce.
    {
      const x = clamp01(f / LAND_AT);
      let dy = DROP_H * (1 - x * x);
      const sinceLand = (f - LAND_AT) * CYCLE;
      if (sinceLand > 0 && sinceLand < 0.4) {
        const b = sinceLand / 0.4;
        dy += 0.045 * Math.sin(b * Math.PI) * (1 - b);
      }
      const spinIn = (1 - easeBrand(x)) * 1.6;
      const wobble = (1 - x) * 0.45 * Math.sin(x * 7);
      placeOnHelix(N - 1 - settle, dy * (0.35 + 0.65 * p), spinIn, 0, wobble);
      const flare =
        (sinceLand > 0 ? Math.exp(-sinceLand * 2.2) * 0.8 : 0.4 * x) * (1 - smooth(0.85, 1, f));
      writeSlot(SLOT_DROP, smooth(0, 0.35, x), rimBase + flare);
    }

    // Reveal: the bottom coin peels outward, flips up and fades away.
    {
      const x = clamp01((f - PEEL_FROM) / (1 - PEEL_FROM));
      const e = x * x * (3 - 2 * x);
      placeOnHelix(0, -0.35 * e - 0.25 * e * e, -0.5 * e, 1.5 * e, 1.1 * e);
      const flare = x > 0 ? Math.sin(clamp01(x / 0.3) * Math.PI) * 0.7 : 0;
      writeSlot(SLOT_PEEL, 1 - smooth(0.15, 0.95, x), rimBase + flare);
    }

    coins.instanceMatrix.needsUpdate = true;
    rims.instanceMatrix.needsUpdate = true;
    if (rims.instanceColor) rims.instanceColor.needsUpdate = true;
    fadeAttr.needsUpdate = true;

    // Spine and base ring follow the helix extent.
    const bottom = helixY(0) - 0.25;
    const top = helixY(N - 1) + 0.35;
    spine.scale.set(1, Math.max(top - bottom, 0.01), 1);
    spine.position.y = (top + bottom) / 2;
    base.position.y = bottom;
    spineMat.opacity = 0.2 + 0.15 * focus;
    baseMat.opacity = (0.18 + 0.14 * focus) * (0.4 + 0.6 * p);
  }

  function dispose() {
    const seen = new Set();
    object.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
      const m = o.material;
      if (m) {
        const list = Array.isArray(m) ? m : [m];
        for (const mm of list) {
          if (!seen.has(mm)) {
            seen.add(mm);
            mm.dispose();
          }
        }
      }
      if (o.isInstancedMesh) o.dispose();
    });
    object.clear();
  }

  update({ time: 0, dt: 0, focus: 0, local: -1, pointer: null, warp: 0, grab: null });

  return { object, radius: 2.6, update, dispose };
}
