// Station "tunnel" — descending into the pit. Receding, segmented glowing
// rings (the brand ramp walking from indigo far away to mauve magic up close),
// each slightly tilted and slowly counter-rotating, with light pulses that
// travel down the tunnel and a stream of particles spiralling inward toward a
// soft glow at the bottom.
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rampColor } from '../palette.js';

const TAU = Math.PI * 2;
const RING_COUNT = 16;
const SPACING = 1.6;
const HALF_DEPTH = ((RING_COUNT - 1) * SPACING) / 2; // 12
const SEGMENT_PATTERN = [1, 3, 2, 4];
const NEAR_FADE_START = 2; // camera → ring distance (world units)
const NEAR_FADE_END = 6;

const PARTICLE_VERT = /* glsl */ `
uniform float uProgress;
uniform float uViewportH;
uniform float uIntensity;
uniform float uWarp;
uniform float uHalfDepth;
uniform vec3 uNear;
uniform vec3 uMid;
uniform vec3 uFar;
attribute float aAngle;
attribute float aRadius;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aTwist;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float u = fract(aPhase + uProgress * aSpeed);
  float z = mix(uHalfDepth + 0.6, -uHalfDepth - 0.6, u);
  float rad = mix(3.0, 0.4, pow(u, 0.85)) * aRadius;
  float ang = aAngle + u * aTwist;
  vec3 p = vec3(cos(ang) * rad, sin(ang) * rad, z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(0.2, -mv.z);
  gl_PointSize = clamp(aSize * projectionMatrix[1][1] * 0.5 * uViewportH / dist, 1.0, 26.0) * (1.0 + uWarp * 0.5);
  vColor = u < 0.5 ? mix(uNear, uMid, u * 2.0) : mix(uMid, uFar, u * 2.0 - 1.0);
  vAlpha = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.8, 1.0, u)) * smoothstep(1.0, 4.5, dist) * uIntensity;
}
`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.0, 0.5, d); // edge0 < edge1, as GLSL requires
  a *= a;
  if (a * vAlpha < 0.004) discard;
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLOW_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float r = length(vUv * 2.0 - 1.0);
  float g = pow(max(0.0, 1.0 - r), 2.6);
  gl_FragColor = vec4(mix(uEdge, uCore, g), g * uIntensity);
}
`;

// Deterministic PRNG so the tunnel looks the same on every visit.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createTunnelPiece(ctx) {
  const { THREE, quality, palette } = ctx;
  const low = quality === 'low';
  const object = new THREE.Group();
  object.name = 'piece:tunnel';

  const twist = new THREE.Group(); // scroll/drag twist of the whole tunnel
  object.add(twist);

  // --- rings ---------------------------------------------------------------
  const rings = [];
  const camPos = new THREE.Vector3();
  const tubular = low ? 96 : 180;
  for (let i = 0; i < RING_COUNT; i++) {
    const k = i / (RING_COUNT - 1); // 0 = far (deep in the pit), 1 = near
    const radius = 2.6 + 0.6 * k;
    const segs = SEGMENT_PATTERN[i % SEGMENT_PATTERN.length];
    const gap = segs > 1 ? 0.16 : 0;
    const arcLen = TAU / segs - gap;
    const pieces = [];
    for (let s = 0; s < segs; s++) {
      const g = new THREE.TorusGeometry(
        radius,
        0.016,
        6,
        Math.max(8, Math.round((tubular * arcLen) / TAU)),
        arcLen,
      );
      g.rotateZ((s * TAU) / segs);
      pieces.push(g);
    }
    // Every fourth ring carries a fine gauge of ticks just outside it.
    if (!low && i % 4 === 2) {
      const ticks = 48;
      for (let s = 0; s < ticks; s++) {
        const g = new THREE.TorusGeometry(radius + 0.2, 0.007, 4, 2, 0.03);
        g.rotateZ((s * TAU) / ticks);
        pieces.push(g);
      }
    }
    const geo = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces, false);
    if (pieces.length > 1) pieces.forEach((g) => g.dispose());

    const base = new THREE.Color(rampColor(k));
    const mat = new THREE.MeshBasicMaterial({
      color: base.clone(),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -HALF_DEPTH + i * SPACING;
    const tiltX = 0.07 * Math.sin(i * 1.7 + 0.4);
    const tiltY = 0.07 * Math.cos(i * 1.1 + 0.9);
    mesh.rotation.set(tiltX, tiltY, i * 0.61);
    twist.add(mesh);
    const ring = {
      mesh,
      mat,
      base,
      opacity: 0.5, // set in update(); the near-camera fade is applied per draw
      depth: 1 - k, // 0 near → 1 far
      phase: i * 0.61,
      dir: i % 2 === 0 ? 1 : -1,
      speed: 0.05 + 0.06 * ((i * 7) % 5) / 4,
      tiltX,
      tiltY,
    };
    // Rings the camera is about to pass through fade out instead of
    // smearing across the lens (the camera parks just beyond the mouth).
    mesh.onBeforeRender = (renderer, scene, camera) => {
      // Closest distance from the camera to the ring's circle, in the
      // tunnel's own frame (axial offset + radial offset from the rim).
      camPos.setFromMatrixPosition(camera.matrixWorld);
      twist.worldToLocal(camPos);
      const axial = camPos.z - mesh.position.z;
      const radial = Math.hypot(camPos.x, camPos.y) - radius;
      const d = Math.sqrt(axial * axial + radial * radial);
      const x = Math.min(1, Math.max(0, (d - NEAR_FADE_START) / (NEAR_FADE_END - NEAR_FADE_START)));
      mat.opacity = ring.opacity * x * x * (3 - 2 * x);
    };
    rings.push(ring);
  }

  // --- the glow at the bottom of the pit ------------------------------------
  const glowUniforms = {
    uCore: { value: new THREE.Color(palette.purpleX11) },
    uEdge: { value: new THREE.Color(palette.indigo) },
    uIntensity: { value: 0.3 },
  };
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 7.5),
    new THREE.ShaderMaterial({
      uniforms: glowUniforms,
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.z = -HALF_DEPTH - 0.8;
  object.add(glow);

  // --- spiralling particles -------------------------------------------------
  const count = low ? 400 : 900;
  const rand = mulberry32(0x5eed);
  const pGeo = new THREE.BufferGeometry();
  const aAngle = new Float32Array(count);
  const aRadius = new Float32Array(count);
  const aPhase = new Float32Array(count);
  const aSpeed = new Float32Array(count);
  const aSize = new Float32Array(count);
  const aTwist = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    aAngle[i] = rand() * TAU;
    aRadius[i] = 0.72 + rand() * 0.34;
    aPhase[i] = rand();
    aSpeed[i] = 0.7 + rand() * 0.6;
    aSize[i] = 0.016 + Math.pow(rand(), 3) * 0.05;
    aTwist[i] = TAU * (1.1 + rand() * 0.9);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  pGeo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
  pGeo.setAttribute('aRadius', new THREE.BufferAttribute(aRadius, 1));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
  pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(aSpeed, 1));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  pGeo.setAttribute('aTwist', new THREE.BufferAttribute(aTwist, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), HALF_DEPTH + 3.5);

  const pUniforms = {
    uProgress: { value: 0 },
    uViewportH: { value: 1000 },
    uIntensity: { value: 0.8 },
    uWarp: { value: 0 },
    uHalfDepth: { value: HALF_DEPTH },
    uNear: { value: new THREE.Color(palette.mauve) },
    uMid: { value: new THREE.Color(palette.hyperMagenta) },
    uFar: { value: new THREE.Color(palette.royalViolet) },
  };
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      uniforms: pUniforms,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = (renderer) => {
    renderer.getDrawingBufferSize(drawSize);
    pUniforms.uViewportH.value = drawSize.y || 1000;
  };
  twist.add(points);

  // --- motion ----------------------------------------------------------------
  let progress = 0;
  let prevLocal = null;

  function update(state) {
    const t = state.time || 0;
    const dt = state.dt || 0;
    const focus = state.focus || 0;
    const local = state.local || 0;
    const warp = state.warp || 0;
    const gx = state.grab ? state.grab.x : 0;
    const px = state.pointer ? state.pointer.x : 0;
    const py = state.pointer ? state.pointer.y : 0;

    // Particles: slow drift, faster when centered, a push while scrolling,
    // a streak on warp.
    const dLocal = prevLocal === null ? 0 : Math.min(0.5, Math.abs(local - prevLocal));
    prevLocal = local;
    progress += dt * (0.03 + 0.07 * focus + 0.4 * warp) + dLocal * 0.12;
    if (progress > 1000) progress -= 1000;
    pUniforms.uProgress.value = progress;
    pUniforms.uWarp.value = warp;
    pUniforms.uIntensity.value = 0.45 + 0.5 * focus;

    // Rings: counter-rotation + scroll twist; pulses travel near → far.
    const vis = 0.45 + 0.55 * focus;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const spin = r.phase + r.dir * (t * r.speed + local * 0.35);
      r.mesh.rotation.set(r.tiltX, r.tiltY, spin);
      let phase = r.depth * 2 - t * 0.16;
      phase -= Math.round(phase);
      const pulse = Math.exp(-phase * phase * 70);
      const nearBoost = 0.55 + 0.45 * (1 - r.depth);
      r.opacity = Math.min(1, (0.28 + 0.72 * pulse) * vis * nearBoost + warp * 0.3);
      r.mat.opacity = r.opacity;
      r.mat.color.copy(r.base).multiplyScalar(0.85 + 0.95 * pulse);
    }

    twist.rotation.z = gx * 0.6 + px * 0.05;
    twist.rotation.x = -py * 0.03;
    glowUniforms.uIntensity.value = 0.18 + 0.2 * focus + 0.2 * warp;
  }

  function dispose() {
    object.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  return { object, radius: 3.5, update, dispose };
}
