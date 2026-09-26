// Sequence — "keeps working after the first email".
//
// A smooth S-curve track (email → wait → follow-up → wait → follow-up). Three
// step nodes sit on it with small "wait" ticks between; bright pulses travel
// the track continuously, easing into each node (the wait) and lighting it as
// they pass — the node's glow spikes, a ripple ring expands, then it decays.
// A soft additive ghost tube carries a slow moving gradient plus a comet trail
// behind every pulse. As the chapter approaches (local −1 → 0) the track draws
// itself on from the first node.
import { rampColor } from '../palette.js';

// ≈6.3 units long: a gentle S in x/y with some depth in z.
const CURVE_POINTS = [
  [-2.7, -0.75, 0.0],
  [-1.7, -0.95, 0.45],
  [-0.7, -0.15, 0.05],
  [0.4, 0.5, -0.45],
  [1.5, 0.4, 0.1],
  [2.6, 0.95, 0.35],
];
const T_NODES = [0.1, 0.5, 0.9];
const T_TICKS = [0.22, 0.3, 0.38, 0.62, 0.7, 0.78];
const SEG_T = [0, 0.1, 0.5, 0.9, 1]; // travel segments: start → node → node → node → end
const PERIOD = 9; // seconds for one pulse to traverse the track (slow, precise idle)
const MAX_PULSES = 5;

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

/** Pulse phase φ ∈ [0,1) → arc-length position u; slows (never stops) at each node. */
function travel(phi) {
  for (let s = 0; s < 4; s++) {
    const a = SEG_T[s];
    const b = SEG_T[s + 1];
    if (phi <= b || s === 3) {
      const x = clamp01((phi - a) / (b - a));
      return a + (b - a) * (0.35 * x + 0.65 * x * x * (3 - 2 * x));
    }
  }
  return phi;
}

/** Node glow response to a pulse at signed distance d = u − tNode: sharp rise, slow decay. */
function nodeKernel(d) {
  if (d < 0) {
    const k = d / 0.012;
    return Math.exp(-k * k);
  }
  return Math.exp(-d / 0.07);
}

// ── Shaders ────────────────────────────────────────────────────────────────
const VERT_GHOST = /* glsl */ `
#include <fog_pars_vertex>
varying float vU;
varying float vFacing;
void main() {
  vU = uv.x;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFacing = abs(dot(n, normalize(-mvPosition.xyz)));
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG_GHOST = /* glsl */ `
uniform float uTime;
uniform float uPulses[${MAX_PULSES}];
uniform float uWeights[${MAX_PULSES}];
uniform float uDraw;
uniform float uIntensity;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vU;
varying float vFacing;
#include <fog_pars_fragment>
void main() {
  float wave = 0.5 + 0.5 * sin((vU * 3.0 - uTime * 0.22) * 6.2831853);
  float base = 0.035 + 0.05 * wave;
  float trail = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    float d = uPulses[i] - vU; // > 0 behind the pulse
    trail += uWeights[i] * (d >= 0.0 ? exp(-d * 16.0) : exp(d * 90.0));
  }
  // Clamp first: with MSAA the varying is extrapolated at the silhouette and
  // can dip below 0, and pow() of a negative base is undefined (NaN specks).
  float body = pow(max(vFacing, 0.0), 1.8);
  float head = 1.0 - smoothstep(uDraw - 0.015, uDraw, vU);
  float a = (base + trail * 0.42) * body * head * uIntensity;
  vec3 col = mix(uColorA, uColorB, clamp(trail, 0.0, 1.0));
  gl_FragColor = vec4(col * a, 1.0);
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
}
`;

// ── Piece ──────────────────────────────────────────────────────────────────
export function createSequencePiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';
  const env = envMap || null;
  const col = (hex) => new THREE.Color(hex);

  const object = new THREE.Group();
  object.name = 'piece:sequence';
  const pivot = new THREE.Group();
  object.add(pivot);

  const curve = new THREE.CatmullRomCurve3(
    CURVE_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  );

  // ── Track tube (indigo 2 → purple along its length) ──
  const TUBULAR = high ? 260 : 130;
  const RADIAL = high ? 10 : 6;
  const tubeGeo = new THREE.TubeGeometry(curve, TUBULAR, 0.035, RADIAL, false);
  {
    const colors = new Float32Array(tubeGeo.attributes.position.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i <= TUBULAR; i++) {
      c.setHex(rampColor((i / TUBULAR) * 0.55));
      for (let j = 0; j <= RADIAL; j++) {
        const k = (i * (RADIAL + 1) + j) * 3;
        colors[k] = c.r;
        colors[k + 1] = c.g;
        colors[k + 2] = c.b;
      }
    }
    tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  const tubeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.4, 1.4, 1.4),
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.renderOrder = 1;
  pivot.add(tube);
  const tubeIdxPerSeg = RADIAL * 6;

  // ── Ghost trail tube ──
  const GHOST_RADIAL = high ? 14 : 8;
  const ghostGeo = new THREE.TubeGeometry(curve, TUBULAR, 0.12, GHOST_RADIAL, false);
  const ghostIdxPerSeg = GHOST_RADIAL * 6;
  const ghostMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uPulses: { value: new Array(MAX_PULSES).fill(-10) },
        uWeights: { value: new Array(MAX_PULSES).fill(0) },
        uDraw: { value: 0 },
        uIntensity: { value: 1 },
        uColorA: { value: col(palette.royalViolet) },
        uColorB: { value: col(palette.neonViolet).multiplyScalar(1.3) },
      },
    ]),
    vertexShader: VERT_GHOST,
    fragmentShader: FRAG_GHOST,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const ghost = new THREE.Mesh(ghostGeo, ghostMat);
  ghost.renderOrder = 2;
  pivot.add(ghost);
  const ghostPulses = ghostMat.uniforms.uPulses.value;
  const ghostWeights = ghostMat.uniforms.uWeights.value;

  // ── Step nodes + halo/ripple rings ──
  const nodeGeo = new THREE.SphereGeometry(0.22, high ? 40 : 24, high ? 28 : 16);
  const haloGeo = new THREE.RingGeometry(0.3, 0.312, high ? 72 : 40);
  const haloMat = new THREE.MeshBasicMaterial({
    color: col(palette.mauve),
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const nodes = T_NODES.map((t, i) => {
    const hue = 0.2 + i * 0.3;
    const mat = new THREE.MeshPhysicalMaterial({
      color: col(rampColor(hue)).lerp(col(palette.ink900), 0.35),
      metalness: 0.35,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: col(rampColor(hue + 0.15)),
      emissiveIntensity: 0.15,
      envMap: env,
      envMapIntensity: 1.2,
    });
    const group = new THREE.Group();
    curve.getPointAt(t, group.position);
    const mesh = new THREE.Mesh(nodeGeo, mat);
    group.add(mesh);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.renderOrder = 3;
    group.add(halo);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: col(palette.mauveMagic),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const ripple = new THREE.Mesh(haloGeo, rippleMat);
    ripple.renderOrder = 3;
    group.add(ripple);
    pivot.add(group);
    return { t, group, mesh, mat, halo, ripple, rippleMat, rippleAge: 99, spike: 0 };
  });

  // ── Wait ticks (small rings threaded on the track) ──
  const tickGeo = new THREE.TorusGeometry(0.075, 0.009, 6, high ? 32 : 20);
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const ticks = new THREE.InstancedMesh(tickGeo, tickMat, T_TICKS.length);
  ticks.frustumCulled = false;
  ticks.renderOrder = 3;
  const tickPos = [];
  const tickQuat = [];
  {
    const tangent = new THREE.Vector3();
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let j = 0; j < T_TICKS.length; j++) {
      const p = curve.getPointAt(T_TICKS[j], new THREE.Vector3());
      curve.getTangentAt(T_TICKS[j], tangent).normalize();
      tickPos.push(p);
      tickQuat.push(new THREE.Quaternion().setFromUnitVectors(zAxis, tangent));
    }
  }
  const tickBase = col(palette.mauve).multiplyScalar(0.3);
  const tickHot = col(palette.mauveMagic).multiplyScalar(1.5);
  const tickGlow = new Float32Array(T_TICKS.length);
  pivot.add(ticks);

  // ── Pulses (+ the draw-on head) ──
  // Few, evenly spaced pulses: one flash per node every PERIOD / pulseCount
  // seconds, never a strobe.
  const pulseCount = high ? 2 : 1;
  const phases = high ? [0, 0.5] : [0];
  const pulseGeo = new THREE.SphereGeometry(0.058, 16, 12);
  const pulseMat = new THREE.MeshBasicMaterial({
    color: col(palette.neonViolet).multiplyScalar(2.2),
    toneMapped: false,
  });
  const pulses = [];
  for (let i = 0; i < pulseCount; i++) {
    const mesh = new THREE.Mesh(pulseGeo, pulseMat);
    mesh.renderOrder = 4;
    pivot.add(mesh);
    pulses.push({ mesh, phase: phases[i], prevU: -1 });
  }
  const head = new THREE.Mesh(pulseGeo, pulseMat);
  head.renderOrder = 4;
  pivot.add(head);

  // ── Per-frame state (preallocated) ──
  const dummy = new THREE.Object3D();
  const tmp = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  let clock = 0;
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

    clock += dt * (1 + 2.5 * warp);
    px = damp(px, pointer ? pointer.x : 0, 2.5, dt);
    py = damp(py, pointer ? pointer.y : 0, 2.5, dt);
    const gx = grab ? grab.x : 0;
    const gy = grab ? Math.max(-0.6, Math.min(0.6, grab.y)) : 0;

    pivot.rotation.set(
      0.05 - py * 0.1 + gy,
      -0.2 + Math.sin(time * 0.13) * 0.08 + px * 0.12 + gx,
      0,
    );
    pivot.position.set(0, Math.sin(time * 0.5) * 0.06, -warp * 0.4);

    // Draw-on, scrubbed by the approach.
    const drawP = smooth(-1, -0.08, local);
    const drawn = drawP >= 0.999;
    const segs = drawn ? TUBULAR : Math.floor(drawP * TUBULAR);
    tubeGeo.setDrawRange(0, segs * tubeIdxPerSeg);
    ghostGeo.setDrawRange(0, segs * ghostIdxPerSeg);

    const intensity = 0.55 + 0.45 * focus;
    ghostMat.uniforms.uTime.value = time;
    ghostMat.uniforms.uDraw.value = drawn ? 2 : drawP;
    ghostMat.uniforms.uIntensity.value = intensity;
    tubeMat.opacity = 0.45 + 0.2 * focus;

    // Draw head spark.
    const headVis = drawn ? 0 : smooth(0, 0.02, drawP) * (1 - smooth(0.94, 1, drawP));
    head.visible = headVis > 0.001;
    if (head.visible) {
      curve.getPointAt(drawP, head.position);
      head.scale.setScalar(1.15 * headVis);
    }

    // Reset per-frame accumulators.
    for (let n = 0; n < nodes.length; n++) nodes[n].spike = 0;
    for (let j = 0; j < tickGlow.length; j++) tickGlow[j] = 0;
    for (let i = 0; i < MAX_PULSES; i++) {
      ghostPulses[i] = -10;
      ghostWeights[i] = 0;
    }

    // Pulses.
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      let phi = (clock / PERIOD + p.phase) % 1;
      if (phi < 0) phi += 1;
      const u = travel(phi);
      const vis = u <= drawP ? smooth(0, 0.03, u) * (1 - smooth(0.965, 1, u)) : 0;

      p.mesh.visible = vis > 0.001;
      if (p.mesh.visible) {
        curve.getPointAt(u, tmp);
        p.mesh.position.copy(tmp);
        p.mesh.scale.setScalar(vis);
      }
      ghostPulses[i] = u;
      ghostWeights[i] = vis;

      for (let n = 0; n < nodes.length; n++) {
        const node = nodes[n];
        node.spike += vis * nodeKernel(u - node.t);
        const crossed = p.prevU >= 0 && u > p.prevU && p.prevU < node.t && u >= node.t;
        if (crossed && vis > 0.01 && drawP >= node.t) node.rippleAge = 0;
      }
      for (let j = 0; j < tickGlow.length; j++) {
        const k = (u - T_TICKS[j]) / 0.018;
        tickGlow[j] += vis * Math.exp(-k * k);
      }
      p.prevU = u;
    }

    // Nodes.
    for (let n = 0; n < nodes.length; n++) {
      const node = nodes[n];
      const appear = easeBrand(clamp01((drawP - node.t + 0.03) / 0.1));
      const s = Math.min(node.spike, 1.5);
      node.group.visible = appear > 0.001;
      node.mesh.scale.setScalar(Math.max(appear, 1e-3) * (1 + 0.1 * Math.min(s, 1)));
      node.mat.emissiveIntensity = 0.1 + 0.12 * focus + s * 0.7;
      node.halo.scale.setScalar(Math.max(appear, 1e-3));

      node.rippleAge += dt;
      const age = node.rippleAge / 1.1;
      if (age < 1) {
        const e = 1 - (1 - age) * (1 - age);
        node.ripple.scale.setScalar(1 + e * 1.4);
        node.rippleMat.opacity = 0.55 * (1 - age) * (1 - age) * intensity;
      } else {
        node.rippleMat.opacity = 0;
      }
      node.ripple.visible = node.rippleMat.opacity > 0.002;
    }

    // Ticks.
    for (let j = 0; j < T_TICKS.length; j++) {
      const appear = smooth(T_TICKS[j] - 0.01, T_TICKS[j] + 0.03, drawP);
      dummy.position.copy(tickPos[j]);
      dummy.quaternion.copy(tickQuat[j]);
      dummy.scale.setScalar(Math.max(appear, 1e-3));
      dummy.updateMatrix();
      ticks.setMatrixAt(j, dummy.matrix);
      const g = Math.min(tickGlow[j], 1);
      tmpColor.copy(tickBase).multiplyScalar(intensity).lerp(tickHot, g);
      ticks.setColorAt(j, tmpColor);
    }
    ticks.instanceMatrix.needsUpdate = true;
    if (ticks.instanceColor) ticks.instanceColor.needsUpdate = true;
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

  return { object, radius: 3.2, update, dispose };
}
