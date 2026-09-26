// Station "city" — grow revenue. The logo's data bars grown into a skyline:
// an instanced grid of rounded-top bars rising toward the back-right, heights
// breathing in a slow traveling wave, colored along the brand ramp by height,
// over a faint emissive grid. Three taller "signal" bars carry small glowing
// caps (sized like the mark's three signal nodes) joined by a fine line.
//
// Bar heights live in a per-instance attribute; the vertex shader stretches
// only the straight middle of the rounded box, so the rounded tops keep their
// exact radius at any height (scaling the whole box would squash them).
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { rampColor } from '../palette.js';

const TAU = Math.PI * 2;
const FOOT_W = 7;
const FOOT_D = 4.4;
const BASE_Y = -1.55;
const CORNER = 0.07;
const LUT_SIZE = 64;
// Bars stay deep and saturated so only their lit edges and the signal caps
// cross the engine's bloom threshold (~0.22).
const ALBEDO = 0.5;
const POINT_LIGHT_CAP = 1.6;

const GRID_VERT = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Cell lines between the bars, a soft pool of light under the city and a
// slow scan line walking front → back.
const GRID_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uGlow;
uniform vec2 uCell;
uniform vec2 uFoot;
uniform vec2 uHalfPlane;
uniform float uIntensity;
uniform float uTime;
varying vec2 vP;
void main() {
  vec2 q = (vP + uFoot * 0.5) / uCell;
  vec2 f = abs(fract(q + 0.5) - 0.5);
  vec2 w = max(fwidth(q) * 1.2, vec2(1e-4)); // smoothstep needs edge0 < edge1
  vec2 l = 1.0 - smoothstep(vec2(0.0), w, f);
  float line = max(l.x, l.y);
  vec2 e = abs(vP) / uHalfPlane;
  float fade = 1.0 - smoothstep(0.55, 1.0, max(e.x, e.y));
  vec2 n = vP / uHalfPlane;
  float pool = exp(-dot(n, n) * 2.2);
  float scanZ = mix(uFoot.y * 0.6, -uFoot.y * 0.6, fract(uTime * 0.05));
  float sd = (vP.y - scanZ) * 2.2; // squared by hand: pow(x < 0, 2.0) is undefined
  float scan = exp(-sd * sd);
  float a = (line * (0.16 + 0.45 * scan) + pool * 0.12) * fade * uIntensity;
  gl_FragColor = vec4(mix(uGlow, uColor, line), a);
}
`;

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function createCityPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const low = quality === 'low';
  const object = new THREE.Group();
  object.name = 'piece:city';

  // tilt: look down onto the grid; spin: 3/4 view so the skyline climbs away.
  const tilt = new THREE.Group();
  const spin = new THREE.Group();
  tilt.add(spin);
  object.add(tilt);

  const cols = low ? 10 : 13;
  const rows = low ? 6 : 9;
  const count = cols * rows;
  const cellX = FOOT_W / cols;
  const cellZ = FOOT_D / rows;
  const barW = Math.min(cellX, cellZ) * 0.64;

  // --- bars --------------------------------------------------------------
  const barGeo = new RoundedBoxGeometry(barW, 1, barW, low ? 2 : 3, CORNER);
  barGeo.translate(0, 0.5, 0); // bottom on y = 0, unit height
  const heightAttr = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
  heightAttr.setUsage(THREE.DynamicDrawUsage);
  barGeo.setAttribute('aHeight', heightAttr);

  const barMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.35,
    roughness: 0.32,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
    envMap: envMap || null,
    envMapIntensity: 0.55,
    emissive: new THREE.Color(palette.indigo2),
    emissiveIntensity: 0.12,
  });
  barMat.onBeforeCompile = (shader) => {
    shader.uniforms.uMid = { value: 0.5 };
    shader.uniforms.uBaseH = { value: 1 };
    shader.uniforms.uMinH = { value: CORNER * 2 + 0.01 };
    shader.uniforms.uShade = { value: 0.42 };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aHeight;
uniform float uMid;
uniform float uBaseH;
uniform float uMinH;
uniform float uShade;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float dpH = max(aHeight, uMinH);
transformed.y += step(uMid, transformed.y) * (dpH - uBaseH);
transformed.y *= aHeight / dpH;
#ifdef USE_INSTANCING_COLOR
  vColor.rgb *= mix(uShade, 1.0, clamp(transformed.y / max(aHeight, 0.001), 0.0, 1.0));
#endif`,
      );
    // The city is wider than the engine's rim-light offsets, so a rim point
    // light can sit right between the bars. Cap each point light's incident
    // radiance (hue preserved) so it rims the skyline instead of blowing out
    // the bars next to it. No-op if the chunk text ever changes.
    shader.uniforms.uPointCap = { value: POINT_LIGHT_CAP };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uPointCap;')
      .replace(
        '#include <lights_fragment_begin>',
        THREE.ShaderChunk.lights_fragment_begin.replace(
          'getPointLightInfo( pointLight, geometryPosition, directLight );',
          `getPointLightInfo( pointLight, geometryPosition, directLight );
		directLight.color *= min( 1.0, uPointCap / max( 1e-4, max( directLight.color.r, max( directLight.color.g, directLight.color.b ) ) ) );`,
        ),
      );
  };
  barMat.customProgramCacheKey = () => 'dp-city-bars-v2';

  const bars = new THREE.InstancedMesh(barGeo, barMat, count);
  bars.frustumCulled = false; // heights are applied in the shader
  spin.add(bars);

  // Base heights: a gentle rise toward the back-right plus a little texture.
  const baseH = new Float32Array(count);
  const waveK = new Float32Array(count);
  const delay = new Float32Array(count);
  const dummy = new THREE.Object3D();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const xn = c / (cols - 1); // 0 left → 1 right
      const zn = 1 - r / (rows - 1); // 0 front → 1 back
      const g = Math.pow(0.56 * xn + 0.44 * zn, 1.6);
      const jitter = (hash2(c, r) - 0.5) * 0.45 * (0.3 + 0.7 * g);
      baseH[i] = Math.max(0.2, 0.22 + 2.6 * g + jitter);
      waveK[i] = xn * 3.4 + zn * 2.3;
      delay[i] = 0.3 * (0.55 * xn + 0.45 * zn); // front-left rises first
      dummy.position.set(-FOOT_W / 2 + cellX * (c + 0.5), BASE_Y, -FOOT_D / 2 + cellZ * (r + 0.5));
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    }
  }
  bars.instanceMatrix.needsUpdate = true;

  // Signal bars: three taller bars climbing toward the back-right.
  const signalDefs = [
    [0.5, 0.5, 0.75, 0.07],
    [0.67, 0.7, 1.05, 0.085],
    [0.84, 0.88, 1.35, 0.1],
  ];
  const signals = signalDefs.map(([fx, fz, extra, capR]) => {
    const c = Math.round(fx * (cols - 1));
    const r = Math.round((1 - fz) * (rows - 1));
    const i = r * cols + c;
    baseH[i] += extra;
    return {
      index: i,
      x: -FOOT_W / 2 + cellX * (c + 0.5),
      z: -FOOT_D / 2 + cellZ * (r + 0.5),
      capR,
    };
  });

  let maxH = 0;
  for (let i = 0; i < count; i++) maxH = Math.max(maxH, baseH[i] * 1.12 + 0.05);

  // Ramp LUT in linear RGB so per-frame recoloring allocates nothing.
  const lut = new Float32Array(LUT_SIZE * 3);
  const tmp = new THREE.Color();
  for (let k = 0; k < LUT_SIZE; k++) {
    tmp.setHex(rampColor(0.06 + (0.94 * k) / (LUT_SIZE - 1))).multiplyScalar(ALBEDO);
    lut[k * 3] = tmp.r;
    lut[k * 3 + 1] = tmp.g;
    lut[k * 3 + 2] = tmp.b;
  }
  for (let i = 0; i < count; i++) bars.setColorAt(i, tmp);
  const colorArr = bars.instanceColor.array;
  bars.instanceColor.setUsage(THREE.DynamicDrawUsage);

  // --- signal caps + the line that joins them -----------------------------
  const capColor = new THREE.Color(palette.mauveMagic).multiplyScalar(1.9);
  const capGeo = new THREE.SphereGeometry(1, low ? 16 : 24, low ? 12 : 16);
  const capMat = new THREE.MeshBasicMaterial({ color: capColor, toneMapped: false });
  const caps = signals.map((s) => {
    const m = new THREE.Mesh(capGeo, capMat);
    m.scale.setScalar(s.capR);
    spin.add(m);
    return m;
  });
  const linePos = new Float32Array(signals.length * 3);
  const lineGeo = new THREE.BufferGeometry();
  const lineAttr = new THREE.BufferAttribute(linePos, 3);
  lineAttr.setUsage(THREE.DynamicDrawUsage);
  lineGeo.setAttribute('position', lineAttr);
  const lineMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(palette.mauve),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const signalLine = new THREE.Line(lineGeo, lineMat);
  signalLine.frustumCulled = false;
  spin.add(signalLine);

  // --- emissive grid ------------------------------------------------------
  const planeW = FOOT_W + 2.4;
  const planeD = FOOT_D + 2.4;
  const gridUniforms = {
    uColor: { value: new THREE.Color(palette.hyperMagenta) },
    uGlow: { value: new THREE.Color(palette.royalViolet) },
    uCell: { value: new THREE.Vector2(cellX, cellZ) },
    uFoot: { value: new THREE.Vector2(FOOT_W, FOOT_D) },
    uHalfPlane: { value: new THREE.Vector2(planeW / 2, planeD / 2) },
    uIntensity: { value: 1 },
    uTime: { value: 0 },
  };
  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeD).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: gridUniforms,
      vertexShader: GRID_VERT,
      fragmentShader: GRID_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  grid.position.y = BASE_Y - 0.004;
  grid.renderOrder = -1;
  spin.add(grid);

  // --- motion ---------------------------------------------------------------
  function update(state) {
    const t = state.time || 0;
    const local = state.local || 0;
    const focus = state.focus || 0;
    const px = state.pointer ? state.pointer.x : 0;
    const py = state.pointer ? state.pointer.y : 0;
    const gx = state.grab ? state.grab.x : 0;
    const gy = state.grab ? state.grab.y : 0;

    const p = Math.min(1, Math.max(0, local + 1)); // -1 → 0 scrubs the rise
    const hArr = heightAttr.array;
    for (let i = 0; i < count; i++) {
      let e = Math.min(1, Math.max(0, (p - delay[i]) / 0.7));
      e = 1 - (1 - e) * (1 - e) * (1 - e);
      const w = Math.sin(t * 0.7 - waveK[i]);
      const h = (baseH[i] * (1 + 0.1 * w) + 0.04 * w) * e;
      hArr[i] = h;
      const k = Math.min(LUT_SIZE - 1, Math.max(0, Math.round((h / maxH) * (LUT_SIZE - 1)))) * 3;
      colorArr[i * 3] = lut[k];
      colorArr[i * 3 + 1] = lut[k + 1];
      colorArr[i * 3 + 2] = lut[k + 2];
    }
    heightAttr.needsUpdate = true;
    bars.instanceColor.needsUpdate = true;

    let capVis = 1;
    for (let s = 0; s < signals.length; s++) {
      const sig = signals[s];
      const h = hArr[sig.index];
      let e = Math.min(1, Math.max(0, (p - delay[sig.index]) / 0.7));
      e = Math.min(1, Math.max(0, (e - 0.8) / 0.2));
      capVis = Math.min(capVis, e);
      const y = BASE_Y + h + sig.capR + 0.08 + Math.sin(t * 1.1 + s * 1.7) * 0.03;
      caps[s].position.set(sig.x, y, sig.z);
      caps[s].scale.setScalar(sig.capR * (e < 0.001 ? 0.0001 : e));
      linePos[s * 3] = sig.x;
      linePos[s * 3 + 1] = y;
      linePos[s * 3 + 2] = sig.z;
    }
    lineAttr.needsUpdate = true;
    lineMat.opacity = 0.35 * capVis * (0.5 + 0.5 * focus);

    spin.rotation.y = 0.35 + Math.sin((t * TAU) / 24) * 0.08 + px * 0.08 + gx;
    tilt.rotation.x = 0.26 - py * 0.05 + gy * 0.5;

    gridUniforms.uTime.value = t;
    gridUniforms.uIntensity.value = 0.5 + 0.5 * focus;
  }

  function dispose() {
    object.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    bars.dispose();
  }

  update({ time: 0, dt: 0, focus: 0, local: -2, pointer: null, warp: 0, grab: null });

  return { object, radius: 4, update, dispose };
}
