// Blocks — pricing: "each block bundles paid seats plus bonus free seats".
//
// Three seat-block clusters side by side (left → right):
//   Basic        =  5 paid + 1 free   (a 2×2 base with a half step on top)
//   Professional =  5 paid + 3 free   (a 2×2×2 cube — raised, with a base ring)
//   Organization = 14 paid + 5 free   (a 3×3 base, a plus of paid seats with
//                                      glass corners, and a glass crown)
// Paid seats are solid rounded cubes along the brand ramp; free seats are
// glass with a faint glow caught in their bevels. As `local` goes -1 → 0 every
// cube travels from a seeded scattered pose to its slot with per-cube
// staggered easing; once assembled the clusters float and breathe gently.
//
// Piece contract: see ../README.md.
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rampColor } from '../palette.js';

const TAU = Math.PI * 2;

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// cubic-bezier(.2, .8, .2, 1) — the design language's motion curve.
function ease(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const it = 1 - t;
    const bx = 0.6 * it * it * t + 0.6 * it * t * t + t * t * t;
    const d = 0.6 * it * it + 2.4 * t * t;
    if (d < 1e-6) break;
    t = clamp01(t - (bx - x) / d);
  }
  const it = 1 - t;
  return 2.4 * it * it * t + 3 * it * t * t + t * t * t;
}

// Deterministic PRNG so the scatter is identical on every visit.
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

const FOG_FADE = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogF = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogF = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  alpha *= 1.0 - fogF;
#endif
`;

// Bevel glow for the glass seats: lights the rounded edges (where two face
// directions meet), a little stronger at grazing angles.
const EDGE_VERT = /* glsl */ `
varying vec3 vLocal;
varying float vFres;
#include <fog_pars_vertex>
void main() {
  vLocal = position;
  vec4 p = vec4( position, 1.0 );
  vec3 n = normal;
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
    n = mat3( instanceMatrix ) * n;
  #endif
  vec4 mvPosition = modelViewMatrix * p;
  vec3 nv = normalize( normalMatrix * n );
  vFres = 1.0 - abs( dot( nv, normalize( - mvPosition.xyz ) ) );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const EDGE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHalf;
uniform float uOpacity;
varying vec3 vLocal;
varying float vFres;
#include <fog_pars_fragment>
void main() {
  vec3 a = abs( vLocal ) / uHalf;
  float mx = max( a.x, max( a.y, a.z ) );
  float mn = min( a.x, min( a.y, a.z ) );
  float mid = a.x + a.y + a.z - mx - mn;
  float edge = smoothstep( 0.7, 0.97, mid );
  float alpha = edge * ( 0.4 + 0.6 * vFres ) * uOpacity;
  ${FOG_FADE}
  gl_FragColor = vec4( uColor, alpha );
  #include <colorspace_fragment>
}
`;

const HALO_VERT = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uRing;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float r = length( vUv * 2.0 - 1.0 );
  float d = ( r - uRing ) / 0.09;
  float ring = exp( - d * d );
  float fill = ( 1.0 - smoothstep( 0.0, uRing, r ) ) * 0.12;
  float alpha = ( ring * 0.6 + fill ) * ( 1.0 - smoothstep( 0.85, 1.0, r ) ) * uOpacity;
  ${FOG_FADE}
  gl_FragColor = vec4( uColor, alpha );
  #include <colorspace_fragment>
}
`;

// Caps the direct (punctual-light) specular: the world's rim lights sit just
// behind the row, and an uncapped highlight on a glossy face blooms to a blob.
const SPEC_CAP = /* glsl */ `
#include <lights_fragment_end>
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 1.2 ) );
#ifdef USE_CLEARCOAT
  clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 1.2 ) );
#endif
`;

// Slot = [x, layer, z, free]. Paid seats fill from the bottom; free (bonus)
// seats sit on top.
const P = 0;
const F = 1;
const CLUSTERS = [
  {
    // Basic: 5 paid + 1 free
    w: 2,
    d: 2,
    lift: 0,
    slots: [
      [0, 0, 0, P],
      [1, 0, 0, P],
      [0, 0, 1, P],
      [1, 0, 1, P],
      [0, 1, 0, P],
      [1, 1, 0, F],
    ],
  },
  {
    // Professional: 5 paid + 3 free — "most popular"
    w: 2,
    d: 2,
    lift: 0.28,
    slots: [
      [0, 0, 0, P],
      [1, 0, 0, P],
      [0, 0, 1, P],
      [1, 0, 1, P],
      [0, 1, 0, P],
      [1, 1, 0, F],
      [0, 1, 1, F],
      [1, 1, 1, F],
    ],
  },
  {
    // Organization: 14 paid + 5 free
    w: 3,
    d: 3,
    lift: 0,
    slots: [
      [0, 0, 0, P],
      [1, 0, 0, P],
      [2, 0, 0, P],
      [0, 0, 1, P],
      [1, 0, 1, P],
      [2, 0, 1, P],
      [0, 0, 2, P],
      [1, 0, 2, P],
      [2, 0, 2, P],
      [1, 1, 1, P],
      [1, 1, 0, P],
      [0, 1, 1, P],
      [2, 1, 1, P],
      [1, 1, 2, P],
      [0, 1, 0, F],
      [2, 1, 0, F],
      [0, 1, 2, F],
      [2, 1, 2, F],
      [1, 2, 1, F],
    ],
  },
];

export function createBlocksPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';

  const SIZE = 0.36;
  const BEVEL = 0.05;
  const PITCH = SIZE + 0.045;
  const SPACING = 1.7;
  const X_SHIFT = -0.12; // Organization is wider; recenter the row
  const BASE_Y = -0.5;
  const YAW = 0.6; // each cluster turned to show two faces
  const TILT = 0.3; // group tipped toward the viewer so the tops read
  const SEGMENTS = high ? 3 : 2;

  const rand = mulberry32(0x5ea7);

  const object = new THREE.Group();
  object.name = 'piece:blocks';
  const rig = new THREE.Group(); // pointer tilt / hero drag
  object.add(rig);

  // ------------------------------------------------------------- layout ---
  const cubes = []; // { cluster, free, index, offset, scatter, scatterQ, arc, t }
  let paidCount = 0;
  let freeCount = 0;
  const tmpEuler = new THREE.Euler();
  CLUSTERS.forEach((cl, c) => {
    for (const [gx, gy, gz, kind] of cl.slots) {
      const offset = new THREE.Vector3(
        (gx - (cl.w - 1) / 2) * PITCH,
        gy * PITCH + SIZE / 2,
        (gz - (cl.d - 1) / 2) * PITCH,
      );
      const tx = (c - 1) * SPACING + X_SHIFT + offset.x;
      const ty = BASE_Y + cl.lift + offset.y;
      const scatter = new THREE.Vector3(
        tx * 1.45 + (rand() - 0.5) * 3.2,
        ty + (rand() - 0.35) * 3.4,
        (rand() - 0.55) * 4.2,
      );
      tmpEuler.set((rand() - 0.5) * TAU, (rand() - 0.5) * TAU, (rand() - 0.5) * TAU);
      const scatterQ = new THREE.Quaternion().setFromEuler(tmpEuler);
      const free = kind === F;
      cubes.push({
        cluster: c,
        layer: gy,
        free,
        index: free ? freeCount++ : paidCount++,
        offset,
        scatter,
        scatterQ,
        arc: 0.2 + rand() * 0.4,
        jitter: rand(),
        delay: 0,
      });
    }
  });

  // Assemble bottom layers first, sweeping left → right, with a little jitter.
  const order = cubes
    .map((cube, i) => i)
    .sort((a, b) => {
      const A = cubes[a];
      const B = cubes[b];
      return (
        A.layer * 10 + A.cluster + A.jitter * 0.9 - (B.layer * 10 + B.cluster + B.jitter * 0.9)
      );
    });
  order.forEach((ci, rank) => {
    cubes[ci].delay = (rank / (order.length - 1)) * 0.5;
  });

  // ---------------------------------------------------------- materials ---
  const cubeGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, SEGMENTS, BEVEL);

  // The world's studio environment has a bright neutral ceiling panel and the
  // cube tops face it, so reflections stay restrained (and punctual-light
  // highlights are capped) — otherwise every top face blooms to white.
  const paidMat = new THREE.MeshPhysicalMaterial({
    color: palette.white,
    metalness: 0.35,
    roughness: 0.28,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMap,
    envMapIntensity: 0.35,
  });
  // A whisper of self-light from the instance color so dark ramp stops never
  // go dead black in a dim scene.
  paidMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor.rgb * 0.1;',
      )
      .replace('#include <lights_fragment_end>', SPEC_CAP);
  };
  paidMat.customProgramCacheKey = () => 'datapit-blocks-paid';

  const freeMat = high
    ? new THREE.MeshPhysicalMaterial({
        color: palette.mauve2,
        metalness: 0,
        roughness: 0.08,
        transmission: 0.85,
        thickness: 0.4,
        ior: 1.45,
        attenuationColor: new THREE.Color(palette.mauve),
        attenuationDistance: 1.6,
        specularIntensity: 0.6,
        emissive: palette.mauveMagic,
        emissiveIntensity: 0.03,
        envMap,
        envMapIntensity: 0.35,
      })
    : new THREE.MeshPhysicalMaterial({
        // Low tier: no transmission pass; glass faked with opacity.
        color: palette.mauve2,
        metalness: 0,
        roughness: 0.1,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        specularIntensity: 0.6,
        emissive: palette.mauveMagic,
        emissiveIntensity: 0.05,
        envMap,
        envMapIntensity: 0.4,
      });
  freeMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      SPEC_CAP,
    );
  };
  freeMat.customProgramCacheKey = () => (high ? 'datapit-blocks-glass' : 'datapit-blocks-glass-lo');

  const paid = new THREE.InstancedMesh(cubeGeo, paidMat, paidCount);
  const free = new THREE.InstancedMesh(cubeGeo, freeMat, freeCount);

  const EDGE_SCALE = 1.012;
  const edgeGeo = new RoundedBoxGeometry(
    SIZE * EDGE_SCALE,
    SIZE * EDGE_SCALE,
    SIZE * EDGE_SCALE,
    SEGMENTS,
    BEVEL * EDGE_SCALE,
  );
  const edgeMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(palette.mauveMagic) },
        uHalf: { value: (SIZE * EDGE_SCALE) / 2 },
        uOpacity: { value: 0 },
      },
    ]),
    vertexShader: EDGE_VERT,
    fragmentShader: EDGE_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const edges = new THREE.InstancedMesh(edgeGeo, edgeMat, freeCount);
  edges.renderOrder = 2;

  for (const mesh of [paid, free, edges]) {
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; // instances travel far during assembly
    rig.add(mesh);
  }

  // Paid seat colors along the ramp: deeper at the base, brighter up the
  // stack and across the tiers.
  const tmpColor = new THREE.Color();
  for (const cube of cubes) {
    if (cube.free) continue;
    const t = 0.1 + cube.layer * 0.14 + cube.cluster * 0.12 + cube.jitter * 0.1;
    tmpColor.setHex(rampColor(t));
    paid.setColorAt(cube.index, tmpColor);
  }
  paid.instanceColor.needsUpdate = true;

  // ------------------------------------ "most popular" ring (Professional) ---
  const proBase = new THREE.Group();
  rig.add(proBase);
  const RING_R = 0.72;
  const ringGeo = new THREE.TorusGeometry(RING_R, 0.011, 8, high ? 160 : 96);
  const ringMat = new THREE.MeshBasicMaterial({
    color: palette.neonViolet,
    transparent: true,
    opacity: 0,
    toneMapped: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  proBase.add(ring);

  const HALO_SIZE = 2.2;
  const haloGeo = new THREE.PlaneGeometry(HALO_SIZE, HALO_SIZE);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(palette.hyperMagenta) },
        uOpacity: { value: 0 },
        uRing: { value: RING_R / (HALO_SIZE / 2) },
      },
    ]),
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.005;
  halo.renderOrder = 1;
  proBase.add(halo);

  // --------------------------------------------------------------- state ---
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const clusterPos = CLUSTERS.map(() => new THREE.Vector3());
  const clusterQ = CLUSTERS.map(() => new THREE.Quaternion());
  const breathe = new Float32Array(CLUSTERS.length);
  const tmpPos = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpScale = new THREE.Vector3();
  const mtx = new THREE.Matrix4();
  let ptrX = 0;
  let ptrY = 0;

  function update(state) {
    const time = state.time || 0;
    const dt = state.dt || 0;
    const focus = state.focus || 0;
    const local = state.local || 0;
    const warp = state.warp || 0;
    const pointer = state.pointer;
    const grab = state.grab;

    // Pointer tilts the whole group ±0.12 rad; hero drag on top.
    const k = 1 - Math.exp(-dt * 3);
    ptrX += ((pointer ? pointer.x : 0) - ptrX) * k;
    ptrY += ((pointer ? pointer.y : 0) - ptrY) * k;
    const gx = grab ? grab.x : 0;
    const gy = grab ? grab.y : 0;
    rig.rotation.x = TILT - ptrY * 0.12 + Math.max(-0.5, Math.min(0.5, gy));
    rig.rotation.y = ptrX * 0.12 + gx;

    const a = clamp01(local + 1); // -1 → 0 maps scattered → assembled
    const settled = smoothstep(0.6, 1, a);

    for (let c = 0; c < CLUSTERS.length; c++) {
      const floatY = Math.sin(time * 0.55 + c * 1.7) * 0.045 * settled;
      breathe[c] = 1 + (0.5 + 0.5 * Math.sin(time * 0.8 + c * 1.1)) * 0.022 + warp * 0.18;
      clusterQ[c].setFromAxisAngle(Y_AXIS, YAW + Math.sin(time * 0.32 + c * 1.3) * 0.05 * settled);
      clusterPos[c].set((c - 1) * SPACING + X_SHIFT, BASE_Y + CLUSTERS[c].lift + floatY, 0);
    }

    for (let i = 0; i < cubes.length; i++) {
      const cube = cubes[i];
      const c = cube.cluster;
      const p = ease(clamp01((a - cube.delay) / 0.5));

      tmpTarget
        .copy(cube.offset)
        .multiplyScalar(breathe[c])
        .applyQuaternion(clusterQ[c])
        .add(clusterPos[c]);
      tmpPos.copy(cube.scatter).lerp(tmpTarget, p);
      tmpPos.y += Math.sin(p * Math.PI) * cube.arc;
      tmpQuat.slerpQuaternions(cube.scatterQ, clusterQ[c], p);
      tmpScale.setScalar(0.5 + 0.5 * p);
      mtx.compose(tmpPos, tmpQuat, tmpScale);

      if (cube.free) {
        free.setMatrixAt(cube.index, mtx);
        edges.setMatrixAt(cube.index, mtx);
      } else {
        paid.setMatrixAt(cube.index, mtx);
      }
    }
    paid.instanceMatrix.needsUpdate = true;
    free.instanceMatrix.needsUpdate = true;
    edges.instanceMatrix.needsUpdate = true;

    edgeMat.uniforms.uOpacity.value = (0.35 + 0.4 * a) * (0.8 + 0.2 * focus + 0.5 * warp);

    // Professional's base ring settles in once the cubes have landed.
    proBase.position.copy(clusterPos[1]);
    proBase.position.y -= 0.06;
    const ringPulse = 1 + Math.sin(time * 0.9) * 0.015;
    proBase.scale.set(ringPulse, 1, ringPulse);
    ringMat.opacity = 0.85 * settled;
    haloMat.uniforms.uOpacity.value = settled * (0.55 + 0.25 * focus + 0.5 * warp);
    proBase.visible = settled > 0.001;
  }

  function dispose() {
    const geos = new Set();
    const mats = new Set();
    object.traverse((o) => {
      if (o.geometry) geos.add(o.geometry);
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => mats.add(m));
        else mats.add(o.material);
      }
    });
    paid.dispose();
    free.dispose();
    edges.dispose();
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    object.removeFromParent();
  }

  return { object, radius: 3.4, update, dispose };
}
