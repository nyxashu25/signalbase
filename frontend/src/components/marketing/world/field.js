// The Signal Field — the global GPU particle atmosphere that fills the whole
// flight path of the Signal World (see ./README.md).
//
// A wide tube of soft points around the flight axis (-Z). Every particle's
// motion is computed in the vertex shader (slow drift + a gentle swirl around
// the axis), and z wraps relative to the camera so the field is effectively
// infinite no matter how far the camera flies. A LineSegments child carries
// the route-change warp: near-axis streaks whose length scales with `warp`
// and which are invisible when warp is ~0.
//
// Constructed with plain three.js objects only (no DOM), so a Node smoke test
// can build it. No allocations in update().

const SPAN = 220; // z extent of the field window (world units)
const BEHIND = 0.25; // fraction of the window kept behind the camera
const TAU = Math.PI * 2;

// Small deterministic PRNG — the field looks identical on every visit.
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

// Shared GLSL: wrap a world z into the camera-relative window, plus the
// drift/swirl that both the points and the streaks follow.
const WRAP_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uWarp;
  uniform float uCameraZ;
  uniform float uTravel;
  uniform float uSpan;
  uniform float uBehind;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform vec3 uColD;

  float wrapZ(float z) {
    float ahead = uSpan * (1.0 - uBehind);
    return mod(z - uCameraZ + ahead, uSpan) - ahead + uCameraZ;
  }

  vec3 rampMix(float m) {
    vec3 c = mix(uColA, uColB, smoothstep(0.0, 0.34, m));
    c = mix(c, uColC, smoothstep(0.34, 0.68, m));
    return mix(c, uColD, smoothstep(0.68, 1.0, m));
  }

  // Depth fade: veiled by distance like the scene fog, and faded out very
  // close to the lens so nothing blobs across the screen.
  float depthFade(float depth) {
    float f = 0.021 * depth;
    float fog = exp(-f * f);
    return fog * smoothstep(0.6, 4.0, depth);
  }
`;

const POINTS_VERTEX = /* glsl */ `
  ${WRAP_GLSL}
  uniform float uHalfHeight;
  uniform float uOpacity;
  attribute float aSeed;
  attribute float aSize;
  attribute float aColorMix;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(position.xy);
    float th = atan(position.y, position.x);

    // Gentle swirl around the axis — inner particles turn a touch faster.
    th += uTime * (0.010 + 0.022 * aSeed) * (10.0 / (r + 6.0));
    // Slow breathing of the radius; the tube opens slightly during warp.
    r += sin(uTime * 0.21 + aSeed * 31.4) * 0.35;
    r *= 1.0 + uWarp * 0.12;

    float z = position.z + uTime * (0.18 + 0.42 * aSeed) + uTravel;
    vec3 p = vec3(cos(th) * r, sin(th) * r + sin(uTime * 0.37 + aSeed * 19.0) * 0.18, wrapZ(z));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = -mv.z;
    // True size attenuation: world-space size projected to pixels.
    float px = aSize * projectionMatrix[1][1] * uHalfHeight / max(depth, 0.05);
    px *= 1.0 + uWarp * 0.5;
    float maxPx = max(2.0, uHalfHeight * 0.05);
    float size = clamp(px, 1.0, maxPx);
    // Sub-pixel points dim instead of shimmering.
    float energy = min(1.0, (px * px) / (size * size));

    float twinkle = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.4) + aSeed * 57.0);
    vAlpha = depth > 0.0 ? uOpacity * depthFade(depth) * energy * twinkle * (1.0 + uWarp * 1.25) : 0.0;
    vColor = rampMix(aColorMix);
    gl_PointSize = depth > 0.0 ? size : 0.0;
  }
`;

const POINTS_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float d = dot(uv, uv);
    if (d > 1.0) discard;
    float halo = (1.0 - d) * (1.0 - d);
    float core = exp(-d * 7.0);
    float a = (halo * 0.62 + core * 0.38) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

const STREAK_VERTEX = /* glsl */ `
  ${WRAP_GLSL}
  uniform float uStreakOpacity;
  attribute float aSeed;
  attribute float aEnd;
  attribute float aColorMix;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = length(position.xy);
    float th = atan(position.y, position.x) + uTime * 0.02;
    float z = wrapZ(position.z + uTravel * (1.0 + aSeed * 0.6));
    // The tail reaches back toward the camera: on screen every streak
    // radiates from the vanishing point, longer the harder the warp hits.
    float len = uWarp * (4.0 + aSeed * 14.0);
    vec3 p = vec3(cos(th) * r, sin(th) * r, z + aEnd * len);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depth = -mv.z;
    float head = 1.0 - aEnd;
    vAlpha = depth > 0.0 ? uStreakOpacity * uWarp * depthFade(depth) * (0.18 + 0.82 * head) : 0.0;
    vColor = rampMix(aColorMix);
  }
`;

const STREAK_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

/**
 * @param {{ THREE: typeof import('three'), quality?: 'high'|'low', palette: Record<string, number> }} ctx
 */
export function createSignalField({ THREE, quality = 'high', palette }) {
  const high = quality === 'high';
  const COUNT = high ? 9000 : 3500;
  const STREAKS = high ? 1200 : 500;
  const rand = mulberry32(0x5d17a);

  // --- uniforms (shared {value} objects between the two materials) ---------
  const uTime = { value: 0 };
  const uWarp = { value: 0 };
  const uCameraZ = { value: 0 };
  const uTravel = { value: 0 };
  const uSpan = { value: SPAN };
  const uBehind = { value: BEHIND };
  const uColA = { value: new THREE.Color(palette.mauveMagic) };
  const uColB = { value: new THREE.Color(palette.hyperMagenta) };
  const uColC = { value: new THREE.Color(palette.neonViolet) };
  const uColD = { value: new THREE.Color(palette.mauve) };
  const uHalfHeight = { value: 540 };
  const shared = { uTime, uWarp, uCameraZ, uTravel, uSpan, uBehind, uColA, uColB, uColC, uColD };

  // --- the atmosphere points ------------------------------------------------
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const sizes = new Float32Array(COUNT);
  const mixes = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    // Radius 3..24, denser toward the axis (where the stations are).
    const r = 3 + 21 * Math.pow(rand(), 1.45);
    const th = rand() * TAU;
    positions[i * 3] = Math.cos(th) * r;
    positions[i * 3 + 1] = Math.sin(th) * r;
    positions[i * 3 + 2] = (rand() - 0.5) * SPAN;
    seeds[i] = rand();
    // Mostly fine dust, a few larger soft motes.
    sizes[i] = rand() < 0.045 ? 0.07 + rand() * 0.06 : 0.022 + rand() * 0.034;
    mixes[i] = rand();
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  pointsGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  pointsGeometry.setAttribute('aColorMix', new THREE.BufferAttribute(mixes, 1));

  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms: { ...shared, uHalfHeight, uOpacity: { value: high ? 0.56 : 0.64 } },
    vertexShader: POINTS_VERTEX,
    fragmentShader: POINTS_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  points.frustumCulled = false; // positions are computed on the GPU
  points.renderOrder = -1;

  // Point sizes are projected against the height of whatever is being drawn
  // into (the composer's render target, or the canvas), read at draw time.
  const drawSize = new THREE.Vector2();
  points.onBeforeRender = (renderer) => {
    const target = renderer.getRenderTarget();
    const h = target ? target.height : renderer.getDrawingBufferSize(drawSize).y;
    uHalfHeight.value = Math.max(1, h * 0.5);
  };

  // --- the warp streaks -----------------------------------------------------
  const streakPositions = new Float32Array(STREAKS * 2 * 3);
  const streakSeeds = new Float32Array(STREAKS * 2);
  const streakEnds = new Float32Array(STREAKS * 2);
  const streakMixes = new Float32Array(STREAKS * 2);
  for (let i = 0; i < STREAKS; i++) {
    const r = 2.4 + 9 * Math.pow(rand(), 1.2);
    const th = rand() * TAU;
    const x = Math.cos(th) * r;
    const y = Math.sin(th) * r;
    const z = (rand() - 0.5) * SPAN;
    const seed = rand();
    // Streaks lean toward the pale end of the ramp.
    const mix = 0.35 + rand() * 0.65;
    for (let e = 0; e < 2; e++) {
      const v = i * 2 + e;
      streakPositions[v * 3] = x;
      streakPositions[v * 3 + 1] = y;
      streakPositions[v * 3 + 2] = z;
      streakSeeds[v] = seed;
      streakEnds[v] = e;
      streakMixes[v] = mix;
    }
  }
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  streakGeometry.setAttribute('aSeed', new THREE.BufferAttribute(streakSeeds, 1));
  streakGeometry.setAttribute('aEnd', new THREE.BufferAttribute(streakEnds, 1));
  streakGeometry.setAttribute('aColorMix', new THREE.BufferAttribute(streakMixes, 1));

  const streakMaterial = new THREE.ShaderMaterial({
    uniforms: { ...shared, uStreakOpacity: { value: high ? 0.6 : 0.7 } },
    vertexShader: STREAK_VERTEX,
    fragmentShader: STREAK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
  streaks.frustumCulled = false;
  streaks.visible = false;
  streaks.renderOrder = -1;

  const object = new THREE.Group();
  object.name = 'SignalField';
  object.add(points);
  object.add(streaks);

  let travel = 0;

  return {
    object,
    /** @param {{ time: number, dt: number, warp: number, cameraZ: number }} s */
    update({ time, dt, warp, cameraZ }) {
      const w = warp > 0 ? (warp < 1 ? warp : 1) : 0;
      // During the warp the whole field rushes past the camera. (Grows by
      // ~20 units per warp; the shader wraps it, so it never needs resetting.)
      travel += (dt || 0) * w * 42;
      uTime.value = time;
      uWarp.value = w;
      uCameraZ.value = cameraZ;
      uTravel.value = travel;
      streaks.visible = w > 0.002;
    },
    dispose() {
      object.remove(points);
      object.remove(streaks);
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      streakGeometry.dispose();
      streakMaterial.dispose();
      points.onBeforeRender = () => {};
    },
  };
}
