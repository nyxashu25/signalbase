// Reveal — "verified before you spend a credit".
//
// A floating glass contact card. Its email line starts masked (a blurred,
// slowly churning band); a vertical scan sweep crosses the card and the line
// resolves into crisp, bright glyph bars behind it, holds, then dissolves back
// to masked. A verified badge (metal ring + lit check) orbits the top-right
// corner and pops when the email resolves. The card tilts toward the pointer,
// floats, and swings in from a steep angle as its chapter approaches.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ── Layout (card-local units; the face is the +z side) ──────────────────────
const CARD_W = 3.4;
const CARD_H = 2.1;
const CARD_D = 0.12;
const FACE_Z = CARD_D / 2;

const EMAIL_PLANE_W = 2.8; // includes margin for the blur spread
const EMAIL_PLANE_H = 0.3;
const EMAIL_X = -0.19; // glyph left edge lands on the card's -1.45 margin
const EMAIL_Y = -0.5;

// ── Timeline (seconds within one reveal cycle) ─────────────────────────────
const CYCLE = 4.5;
const SWEEP_START = 0.5;
const SWEEP_DUR = 1.4;
const HOLD_END = 2.95; // re-mask begins (email fully crisp ≈1.5 s before this)
const REMASK_DUR = 0.7;
const VERIFY_AT = 1.45; // sweep has cleared the email → badge pops
const BEAM_FROM = -1.85;
const BEAM_TO = 1.85;

// ── Small math helpers (allocation-free) ────────────────────────────────────
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
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

// ── Shaders ────────────────────────────────────────────────────────────────
const GLSL_SD_ROUND_BOX = /* glsl */ `
float sdRoundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
`;

const GLSL_NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

const VERT_UV = /* glsl */ `
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// Standard tail for alpha-blended shaders.
const FRAG_TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
`;

// Additive shaders fade *out* into fog instead of mixing toward fog color.
const FRAG_TAIL_ADDITIVE = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      float fogF = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      float fogF = smoothstep(fogNear, fogFar, vFogDepth);
    #endif
    gl_FragColor.rgb *= 1.0 - fogF;
  #endif
`;

// Rounded "text line" bar.
const FRAG_PILL = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 uPlane;
uniform vec2 uSize;
varying vec2 vUv;
#include <fog_pars_fragment>
${GLSL_SD_ROUND_BOX}
void main() {
  vec2 p = (vUv - 0.5) * uPlane;
  float d = sdRoundBox(p, uSize * 0.5, uSize.y * 0.5);
  float aa = max(fwidth(d), 1e-4);
  float a = 1.0 - smoothstep(-aa, aa, d);
  gl_FragColor = vec4(uColor, a * uOpacity);
  ${FRAG_TAIL}
}
`;

// Gradient disc (gradient-action, 135deg) with an optional person glyph.
const FRAG_DISC = /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uFigureColor;
uniform float uFigure;
uniform float uOpacity;
uniform float uPad;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  vec2 p = (vUv - 0.5) * 2.0 * uPad;
  float d = length(p) - 1.0;
  float aa = max(fwidth(d), 1e-4);
  float disc = 1.0 - smoothstep(-aa, aa, d);
  float g = clamp((p.x - p.y) * 0.35355 + 0.5, 0.0, 1.0);
  vec3 col = g < 0.48 ? mix(uA, uB, g / 0.48) : mix(uB, uC, (g - 0.48) / 0.52);
  float hl = 1.0 - smoothstep(0.0, 1.2, length(p - vec2(-0.4, 0.5)));
  col += hl * hl * 0.08;
  float head = length(p - vec2(0.0, 0.2)) - 0.3;
  vec2 sp = (p - vec2(0.0, -0.8)) / vec2(0.62, 0.46);
  float body = (length(sp) - 1.0) * 0.46;
  float fig = min(head, body);
  float figA = (1.0 - smoothstep(-aa, aa, fig)) * uFigure;
  col = mix(col, uFigureColor, figA * 0.5);
  float rim = smoothstep(-0.16, -0.02, d) * disc;
  col += rim * 0.06;
  gl_FragColor = vec4(col, disc * uOpacity);
  ${FRAG_TAIL}
}
`;

// Card face: a faint brand wash, a 1px inner hairline, and a soft sheen band
// that slides with the tilt. Additive — it only ever adds light to the glass.
const FRAG_FACE = /* glsl */ `
uniform vec2 uPlane;
uniform vec2 uSize;
uniform float uRadius;
uniform vec3 uEdge;
uniform vec3 uWash;
uniform float uOpacity;
uniform float uSheen;
varying vec2 vUv;
#include <fog_pars_fragment>
${GLSL_SD_ROUND_BOX}
void main() {
  vec2 p = (vUv - 0.5) * uPlane;
  float d = sdRoundBox(p, uSize * 0.5, uRadius);
  float aa = max(fwidth(d), 1e-4);
  float inside = 1.0 - smoothstep(-aa, aa, d);
  float stroke = 1.0 - smoothstep(0.0, aa * 1.25, abs(d + 0.05) - aa * 0.4);
  float wash = mix(0.02, 0.085, vUv.y) * inside;
  float band = p.x * 0.55 + p.y - uSheen;
  float sheen = exp(-band * band * 4.0) * 0.06 * inside;
  vec3 col = uWash * wash + uEdge * (stroke * 0.16 + sheen);
  gl_FragColor = vec4(col * uOpacity, 1.0);
  ${FRAG_TAIL_ADDITIVE}
}
`;

// The email line: masked (blurred + noisy) → crisp glyph bars behind the sweep.
const FRAG_EMAIL = /* glsl */ `
uniform vec2 uPlane;
uniform float uTime;
uniform float uReveal;
uniform float uMask;
uniform float uSweep;
uniform vec3 uColorLo;
uniform vec3 uColorMid;
uniform vec3 uColorHi;
uniform vec3 uGlow;
uniform float uOpacity;
varying vec2 vUv;
#include <fog_pars_fragment>
${GLSL_SD_ROUND_BOX}
${GLSL_NOISE}
float emailSD(vec2 p) {
  float h = 0.048;
  float d = sdRoundBox(p - vec2(-0.79, 0.0), vec2(0.47, h), h);          // local part
  d = min(d, abs(length(p - vec2(-0.2, 0.0)) - 0.042) - 0.014);         // @
  d = min(d, sdRoundBox(p - vec2(0.27, 0.0), vec2(0.35, h), h));        // domain
  d = min(d, length(p - vec2(0.69, -0.032)) - 0.017);                   // .
  d = min(d, sdRoundBox(p - vec2(0.885, 0.0), vec2(0.135, h), h));      // tld
  return d;
}
void main() {
  vec2 p = (vUv - 0.5) * uPlane;
  float d = emailSD(p);
  float aa = max(fwidth(d), 1e-4);

  // Masked: a blurred silhouette of the glyphs, churned by slow noise.
  float n1 = vnoise(vec2(p.x * 7.0 - uTime * 0.9, p.y * 9.0 + uTime * 0.35));
  float n2 = vnoise(p * 21.0 + vec2(uTime * 1.6, -uTime * 0.7));
  float n = n1 * 0.65 + n2 * 0.35;
  float blur = 1.0 - smoothstep(-0.035, 0.12, d);
  float maskedA = blur * (0.3 + 0.5 * n);
  vec3 maskedC = mix(uColorLo, uColorMid, n);

  // Crisp: sharp glyph bars with a hint of letter spacing and a soft halo.
  float crisp = 1.0 - smoothstep(-aa, aa, d);
  float letters = 0.8 + 0.2 * smoothstep(0.1, 0.3, abs(fract(p.x * 12.5) - 0.5) * 2.0);
  vec3 crispC = uColorHi * letters;
  float halo = (1.0 - smoothstep(0.0, 0.07, d)) * 0.16;

  // Revealed where the sweep has passed; re-masked by a noise dissolve.
  float rev = smoothstep(p.x, p.x + 0.14, uReveal);
  float nd = vnoise(p * 16.0 + 3.7);
  float thr = uMask * 1.3 - 0.15;
  rev *= smoothstep(thr, thr + 0.15, nd);

  vec3 col = mix(maskedC, crispC, rev);
  float a = mix(maskedA, max(crisp, halo), rev);

  // The sweep front itself glows on the band as it passes.
  float front = exp(-abs(p.x - uReveal) * 26.0) * uSweep * (1.0 - smoothstep(-0.02, 0.12, d));
  col = mix(col, uGlow, clamp(front, 0.0, 1.0) * 0.6);
  a = max(a, front * 0.9);

  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);
  ${FRAG_TAIL}
}
`;

// Vertical scan beam: a thin bright core, a soft halo, and a faint afterglow
// trailing behind it; clipped to the card face.
const VERT_BEAM = /* glsl */ `
uniform float uX;
varying vec2 vLocal;
#include <fog_pars_vertex>
void main() {
  vLocal = vec2(position.x + uX, position.y);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG_BEAM = /* glsl */ `
uniform float uX;
uniform float uOpacity;
uniform vec2 uHalf;
uniform vec3 uColor;
varying vec2 vLocal;
#include <fog_pars_fragment>
void main() {
  float dx = vLocal.x - uX;
  float core = exp(-abs(dx) * 110.0);
  float halo = exp(-abs(dx) * 16.0) * 0.26;
  float tail = dx < 0.0 ? exp(dx * 3.0) * 0.07 : 0.0;
  float vf = 1.0 - smoothstep(uHalf.y - 0.3, uHalf.y - 0.05, abs(vLocal.y));
  float hf = 1.0 - smoothstep(uHalf.x - 0.22, uHalf.x - 0.04, abs(vLocal.x));
  float a = (core + halo + tail) * vf * hf * uOpacity;
  vec3 col = uColor * (0.8 + core * 1.6);
  gl_FragColor = vec4(col * a, 1.0);
  ${FRAG_TAIL_ADDITIVE}
}
`;

// ── Piece ──────────────────────────────────────────────────────────────────
export function createRevealPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';
  const env = envMap || null;

  const col = (hex) => new THREE.Color(hex);
  const withFog = (u) => THREE.UniformsUtils.merge([THREE.UniformsLib.fog, u]);

  const object = new THREE.Group();
  object.name = 'piece:reveal';
  const pivot = new THREE.Group();
  object.add(pivot);

  // ── Glass card slab ──
  const cardGeo = new RoundedBoxGeometry(CARD_W, CARD_H, CARD_D, high ? 5 : 3, 0.09);
  const cardMat = high
    ? new THREE.MeshPhysicalMaterial({
        color: col(palette.ink800).lerp(col(palette.ink300), 0.6),
        emissive: col(palette.ink800),
        emissiveIntensity: 0.55,
        metalness: 0,
        // Smoked glass: a flat face reflecting the HDR studio at full
        // strength blooms into a pale slab, so the reflection stays low.
        roughness: 0.3,
        transmission: 0.72,
        thickness: 0.5,
        ior: 1.4,
        attenuationColor: col(palette.royalViolet).lerp(col(palette.white), 0.4),
        attenuationDistance: 1.4,
        clearcoat: 0.25,
        clearcoatRoughness: 0.12,
        envMap: env,
        envMapIntensity: 0.35,
      })
    : new THREE.MeshPhysicalMaterial({
        color: col(palette.ink800).lerp(col(palette.ink600), 0.45),
        emissive: col(palette.ink800),
        emissiveIntensity: 0.6,
        metalness: 0.1,
        roughness: 0.22,
        clearcoat: 0.25,
        clearcoatRoughness: 0.15,
        transparent: true,
        opacity: 0.62,
        envMap: env,
        envMapIntensity: 0.35,
      });
  const card = new THREE.Mesh(cardGeo, cardMat);
  pivot.add(card);

  // ── Face overlay: wash + hairline + sheen ──
  const facePlane = new THREE.Vector2(CARD_W, CARD_H);
  const faceMat = new THREE.ShaderMaterial({
    uniforms: withFog({
      uPlane: { value: facePlane },
      uSize: { value: new THREE.Vector2(CARD_W - 0.02, CARD_H - 0.02) },
      uRadius: { value: 0.085 },
      uEdge: { value: col(palette.ink300) },
      uWash: { value: col(palette.royalViolet) },
      uOpacity: { value: 1 },
      uSheen: { value: 0 },
    }),
    vertexShader: VERT_UV,
    fragmentShader: FRAG_FACE,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_H), faceMat);
  face.position.z = FACE_Z + 0.004;
  face.renderOrder = 1;
  pivot.add(face);

  // ── Avatar (gradient-action disc with a person glyph) ──
  const makeDisc = (radius, a, b, c, figure, figureColor) => {
    const pad = 1.08;
    const mat = new THREE.ShaderMaterial({
      uniforms: withFog({
        uA: { value: col(a) },
        uB: { value: col(b) },
        uC: { value: col(c) },
        uFigureColor: { value: col(figureColor) },
        uFigure: { value: figure },
        uOpacity: { value: 1 },
        uPad: { value: pad },
      }),
      vertexShader: VERT_UV,
      fragmentShader: FRAG_DISC,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const size = radius * 2 * pad;
    return new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  };
  const avatar = makeDisc(
    0.34,
    palette.darkViolet,
    palette.purpleX11,
    palette.hyperMagenta,
    1,
    palette.mauve2,
  );
  avatar.position.set(-1.12, 0.36, FACE_Z + 0.012);
  avatar.renderOrder = 2;
  pivot.add(avatar);

  // ── Text-line bars (left-anchored) ──
  const bars = [];
  const addBar = (x0, y, w, h, opacity, hex) => {
    const pad = 0.03;
    const mat = new THREE.ShaderMaterial({
      uniforms: withFog({
        uColor: { value: col(hex) },
        uOpacity: { value: opacity },
        uPlane: { value: new THREE.Vector2(w + pad, h + pad) },
        uSize: { value: new THREE.Vector2(w, h) },
      }),
      vertexShader: VERT_UV,
      fragmentShader: FRAG_PILL,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w + pad, h + pad), mat);
    mesh.position.set(x0 + w / 2, y, FACE_Z + 0.01);
    mesh.renderOrder = 2;
    pivot.add(mesh);
    bars.push({ mat, base: opacity });
    return mesh;
  };
  addBar(-0.62, 0.56, 1.6, 0.12, 0.62, palette.ink300); // name
  addBar(-0.62, 0.34, 1.12, 0.075, 0.34, palette.ink300); // title
  addBar(-0.62, 0.17, 0.8, 0.075, 0.26, palette.ink300); // company
  addBar(-1.45, -0.1, 2.9, 0.008, 0.14, palette.ink300); // divider hairline
  addBar(-1.45, -0.29, 0.36, 0.05, 0.24, palette.ink300); // "email" label
  addBar(-1.45, -0.8, 1.05, 0.07, 0.14, palette.ink300); // phone (stays masked)

  // ── Email line ──
  const emailMat = new THREE.ShaderMaterial({
    uniforms: withFog({
      uPlane: { value: new THREE.Vector2(EMAIL_PLANE_W, EMAIL_PLANE_H) },
      uTime: { value: 0 },
      uReveal: { value: -3 },
      uMask: { value: 0 },
      uSweep: { value: 0 },
      uColorLo: { value: col(palette.ink600) },
      uColorMid: { value: col(palette.darkViolet).lerp(col(palette.ink300), 0.25) },
      uColorHi: { value: col(palette.mauve2).multiplyScalar(1.25) },
      uGlow: { value: col(palette.mauveMagic).multiplyScalar(1.4) },
      uOpacity: { value: 1 },
    }),
    vertexShader: VERT_UV,
    fragmentShader: FRAG_EMAIL,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const email = new THREE.Mesh(new THREE.PlaneGeometry(EMAIL_PLANE_W, EMAIL_PLANE_H), emailMat);
  email.position.set(EMAIL_X, EMAIL_Y, FACE_Z + 0.014);
  email.renderOrder = 3;
  pivot.add(email);

  // ── Scan beam ──
  const beamGeo = new THREE.PlaneGeometry(2.0, CARD_H);
  beamGeo.translate(-0.4, 0, 0); // core at x = 0, afterglow trails 1.4 behind
  const beamMat = new THREE.ShaderMaterial({
    uniforms: withFog({
      uX: { value: BEAM_FROM },
      uOpacity: { value: 0 },
      uHalf: { value: new THREE.Vector2(CARD_W / 2, CARD_H / 2) },
      uColor: { value: col(palette.neonViolet) },
    }),
    vertexShader: VERT_BEAM,
    fragmentShader: FRAG_BEAM,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(BEAM_FROM, 0, FACE_Z + 0.02);
  beam.renderOrder = 4;
  pivot.add(beam);

  // ── Verified badge (orbits the top-right corner) ──
  const badge = new THREE.Group();
  const badgeInner = new THREE.Group();
  badge.add(badgeInner);
  const ringMat = new THREE.MeshPhysicalMaterial({
    color: col(palette.mauveMagic),
    metalness: 0.85,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    emissive: col(palette.neonViolet),
    emissiveIntensity: 0.28,
    envMap: env,
    envMapIntensity: 1.2,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.028, high ? 16 : 10, high ? 64 : 36),
    ringMat,
  );
  badgeInner.add(ring);
  const badgeDisc = makeDisc(
    0.178,
    palette.ink900,
    palette.indigo,
    palette.royalViolet,
    0,
    palette.mauve2,
  );
  badgeDisc.renderOrder = 5;
  badgeInner.add(badgeDisc);

  const checkBase = col(palette.mauveMagic);
  const checkMat = new THREE.MeshBasicMaterial({ color: checkBase.clone(), toneMapped: false });
  const addStroke = (ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) + 0.028;
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.025), checkMat);
    m.position.set((ax + bx) / 2, (ay + by) / 2, 0.03);
    m.rotation.z = Math.atan2(dy, dx);
    badgeInner.add(m);
  };
  addStroke(-0.075, 0.005, -0.022, -0.052);
  addStroke(-0.022, -0.052, 0.08, 0.062);
  pivot.add(badge);

  const BADGE_CX = 1.5;
  const BADGE_CY = 0.86;
  const BADGE_CZ = 0.3;

  // ── Per-frame state (preallocated) ──
  let px = 0;
  let py = 0;

  function update(state) {
    const time = state.time || 0;
    const dt = state.dt || 0;
    const focus = clamp01(state.focus == null ? 1 : state.focus);
    const local = state.local || 0;
    const warp = state.warp || 0;
    const pointer = state.pointer;
    const grab = state.grab;

    // Pointer tilt, damped.
    px = damp(px, pointer ? pointer.x : 0, 3, dt);
    py = damp(py, pointer ? pointer.y : 0, 3, dt);
    const gx = grab ? grab.x : 0;
    const gy = grab ? Math.max(-0.6, Math.min(0.6, grab.y)) : 0;

    // Swing in as the chapter approaches (local −1 → 0), drift on as it leaves.
    const arrive = smooth(-1, -0.05, local);
    const leave = clamp01(local);
    const baseY = -0.9 + 0.65 * arrive + 0.18 * leave;

    pivot.rotation.set(
      -py * 0.15 + gy + Math.sin(time * 0.31) * 0.02,
      baseY + px * 0.15 + gx,
      Math.sin(time * 0.37) * 0.025,
    );
    pivot.position.set(
      -0.45 * (1 - arrive),
      Math.sin(time * 0.55) * 0.07,
      -0.6 * (1 - arrive) - warp * 0.5,
    );

    // Reveal cycle.
    const tau = ((time % CYCLE) + CYCLE) % CYCLE;
    const sweepK = clamp01((tau - SWEEP_START) / SWEEP_DUR);
    const sweeping = tau >= SWEEP_START && tau <= SWEEP_START + SWEEP_DUR;
    const beamX = BEAM_FROM + (BEAM_TO - BEAM_FROM) * smooth(0, 1, sweepK);
    const beamOn = sweeping ? smooth(0, 0.1, sweepK) * (1 - smooth(0.88, 1, sweepK)) : 0;

    let reveal;
    let mask;
    if (tau < SWEEP_START) {
      reveal = -3;
      mask = 0;
    } else if (tau <= SWEEP_START + SWEEP_DUR) {
      reveal = beamX - EMAIL_X;
      mask = 0;
    } else {
      reveal = 3;
      mask = easeBrand((tau - HOLD_END) / REMASK_DUR);
    }

    const intensity = 0.55 + 0.45 * focus;
    const eu = emailMat.uniforms;
    eu.uTime.value = time;
    eu.uReveal.value = reveal;
    eu.uMask.value = mask;
    eu.uSweep.value = beamOn;
    eu.uOpacity.value = 0.75 + 0.25 * focus;

    beam.position.x = beamX;
    beamMat.uniforms.uX.value = beamX;
    beamMat.uniforms.uOpacity.value = beamOn * intensity;

    faceMat.uniforms.uSheen.value = px * 1.2 - py * 0.6 + Math.sin(time * 0.21) * 0.35;
    faceMat.uniforms.uOpacity.value = intensity;

    // The name line brightens slightly while the email is verified.
    const verified =
      smooth(VERIFY_AT - 0.1, VERIFY_AT + 0.1, tau) * (1 - smooth(HOLD_END, HOLD_END + 0.5, tau));
    bars[0].mat.uniforms.uOpacity.value = bars[0].base * (0.85 + 0.25 * verified);

    // Badge orbit + verify pop.
    const a = time * 0.9;
    badge.position.set(
      BADGE_CX + Math.cos(a) * 0.2,
      BADGE_CY + Math.sin(a) * 0.12,
      BADGE_CZ + Math.sin(a + 0.7) * 0.1,
    );
    badgeInner.rotation.set(Math.sin(time * 0.7) * 0.25, Math.sin(time * 0.53 + 1.1) * 0.35, 0);
    const since = tau - VERIFY_AT;
    const pop =
      since > 0 && since < 0.6 ? Math.sin((since / 0.6) * Math.PI) * (1 - since / 0.6) : 0;
    badgeInner.scale.setScalar((0.9 + 0.1 * focus) * (1 + 0.35 * pop));
    const spike = since > 0 ? Math.exp(-since * 2.5) : 0;
    checkMat.color.copy(checkBase).multiplyScalar(0.55 + 0.5 * verified + 1.1 * spike);
    ringMat.emissiveIntensity = 0.22 + 0.25 * verified + 0.6 * spike;
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
    });
    object.clear();
  }

  update({ time: 0, dt: 0, focus: 0, local: -1, pointer: null, warp: 0, grab: null });

  return { object, radius: 2.4, update, dispose };
}
