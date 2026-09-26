// Station "mark" — the hero. The DataPit mark (three signal nodes, three data
// bars, the open D) built from its SVG geometry as a real extruded, beveled,
// clear-coated solid, floating over a lit ring platform with two signal nodes
// on tilted orbits. Drag-spinnable via state.grab.
//
// All 2D work happens in SVG units (viewBox 0 0 160 160, y down); contours are
// flipped to y-up when they become THREE.Shapes, then the merged solid is
// centered and scaled to MARK_WIDTH world units.
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rampColor } from '../palette.js';

const TAU = Math.PI * 2;
const MARK_WIDTH = 4.2; // world units, bevel included
const STROKE_HALF = 11.5; // half of the D's stroke-width (23)
const DEPTH = 14; // extrusion depth in SVG units
const BEVEL_T = 2.2;
const BEVEL_S = 1.6;

// Surface tuning (see the engine: tinted RoomEnvironment, key + two rims,
// bloom threshold ~0.22). The body stays a deep, saturated violet so only the
// bevel highlights and clearcoat glints cross the bloom threshold.
const ALBEDO = 0.42;
const METALNESS = 0.6;
const ROUGHNESS = 0.18;
const ENV_INTENSITY = 0.7;
const SIDE_SHADE = 0.5;
const EMISSIVE = 0.08;

// The logo's own gradient axis (dpGradient: 16,24 → 142,138).
const GRAD_X0 = 16;
const GRAD_Y0 = 24;
const GRAD_DX = 126;
const GRAD_DY = 114;

// ---------------------------------------------------------------------------
// 2D contours (SVG units, y down). Each is an array of [x, y].

function push(out, x, y) {
  const last = out[out.length - 1];
  if (last && Math.abs(last[0] - x) < 1e-6 && Math.abs(last[1] - y) < 1e-6) return;
  out.push([x, y]);
}

// Arc around (cx, cy) from angle a0 to a1 (y-down angles: π/2 points down).
function arc(out, cx, cy, r, a0, a1, n) {
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    push(out, cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
}

function dropClosing(out) {
  const a = out[0];
  const b = out[out.length - 1];
  if (out.length > 1 && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) out.pop();
  return out;
}

function circleContour(cx, cy, r) {
  const out = [];
  arc(out, cx, cy, r, 0, TAU, 72);
  return dropClosing(out);
}

function roundedRectContour(x, y, w, h, rx) {
  const r = Math.min(rx, w / 2, h / 2);
  const n = 18;
  const out = [];
  arc(out, x + r, y + r, r, Math.PI, Math.PI * 1.5, n); // top-left
  arc(out, x + w - r, y + r, r, Math.PI * 1.5, TAU, n); // top-right
  arc(out, x + w - r, y + h - r, r, 0, Math.PI / 2, n); // bottom-right
  arc(out, x + r, y + h - r, r, Math.PI / 2, Math.PI, n); // bottom-left
  return dropClosing(out);
}

function circleIntersections(x0, y0, r0, x1, y1, r1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const d = Math.hypot(dx, dy);
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const mx = x0 + (a * dx) / d;
  const my = y0 + (a * dy) / d;
  return [
    [mx - (h * dy) / d, my + (h * dx) / d],
    [mx + (h * dy) / d, my - (h * dx) / d],
  ];
}

// The open D: path M79 34 H91 C121 34 140 52 140 80 C140 108 121 126 91 126 H79,
// stroke-width 23, round caps — offset ±11.5 along the normals, capped with
// semicircles, as one closed contour.
function dContour() {
  const center = []; // [x, y, tx, ty]
  const add = (x, y, tx, ty) => {
    const last = center[center.length - 1];
    if (last && Math.abs(last[0] - x) < 1e-6 && Math.abs(last[1] - y) < 1e-6) return;
    const l = Math.hypot(tx, ty) || 1;
    center.push([x, y, tx / l, ty / l]);
  };
  const line = (ax, ay, bx, by, n) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      add(ax + (bx - ax) * t, ay + (by - ay) * t, bx - ax, by - ay);
    }
  };
  const cubic = (p0, p1, p2, p3, n) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      const tx =
        3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
      const ty =
        3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      add(x, y, tx, ty);
    }
  };
  line(79, 34, 91, 34, 3);
  cubic([91, 34], [121, 34], [140, 52], [140, 80], 72);
  cubic([140, 80], [140, 108], [121, 126], [91, 126], 72);
  line(91, 126, 79, 126, 3);

  const H = STROKE_HALF;
  const out = [];
  // Outer side: normal (ty, -tx) points away from the D's bowl.
  for (const [x, y, tx, ty] of center) push(out, x + ty * H, y - tx * H);
  arc(out, 79, 126, H, Math.PI / 2, Math.PI * 1.5, 36); // end cap
  for (let i = center.length - 1; i >= 0; i--) {
    const [x, y, tx, ty] = center[i];
    push(out, x - ty * H, y + tx * H);
  }
  arc(out, 79, 34, H, Math.PI / 2, Math.PI * 1.5, 36); // start cap
  return dropClosing(out);
}

// The tallest data bar overlaps the D's lower-left cap in the flat logo. Cut
// the cap's disk out of the bar so the two solids meet edge-to-edge: their
// front faces are coplanar and adjacent, which reads as one seamless union
// (no z-fighting, no visible seam).
function tallBarContour() {
  const x0 = 60;
  const x1 = 76;
  const y0 = 63;
  const r = 8;
  const bottomCy = 126 - r;
  const cx = 79;
  const cy = 126;
  const R = STROKE_HALF;
  const out = [];
  arc(out, x0 + r, y0 + r, r, Math.PI, TAU, 36); // rounded top
  const p1y = cy - Math.sqrt(R * R - (cx - x1) * (cx - x1));
  push(out, x1, p1y); // right edge down to the disk
  const hits = circleIntersections(x0 + r, bottomCy, r, cx, cy, R);
  const p2 = hits[0][0] < hits[1][0] ? hits[0] : hits[1];
  const a1 = Math.atan2(p1y - cy, x1 - cx);
  let a2 = Math.atan2(p2[1] - cy, p2[0] - cx);
  if (a2 > a1) a2 -= TAU;
  arc(out, cx, cy, R, a1, a2, 28); // concave cut along the D's cap
  const b1 = Math.atan2(p2[1] - bottomCy, p2[0] - (x0 + r));
  arc(out, x0 + r, bottomCy, r, b1, Math.PI, 18); // remaining bottom round
  return dropClosing(out); // left edge closes back to the start
}

function toShape(THREE, pts) {
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y)));
}

// ---------------------------------------------------------------------------
// Glow shaders (additive, procedural — no textures).

const PLANE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Lit platform: a soft core, two precise engraved bands and a slow dial of
// ticks just outside the glowing ring.
const PLATFORM_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float core = pow(1.0 - r, 2.4);
  // Squares written out: pow(x, 2.0) is undefined for x < 0 in GLSL ES, and
  // atan(0, 0) at the disc centre is too — either can come back as NaN.
  float b0 = (r - 0.58) * 42.0;
  float b1 = (r - 0.7) * 70.0;
  float band = exp(-b0 * b0) * 0.22 + exp(-b1 * b1) * 0.12;
  float ang = atan(p.y, p.x + 1e-6) + uTime * 0.025;
  float k = fract(ang * 96.0 / 6.2831853);
  float tick = smoothstep(0.3, 0.5, k) * (1.0 - smoothstep(0.5, 0.7, k));
  float b2 = (r - 0.88) * 55.0;
  tick *= exp(-b2 * b2) * 0.3;
  float fade = 1.0 - smoothstep(0.9, 1.0, r);
  vec3 col = mix(uEdge, uCore, clamp(core * 1.6, 0.0, 1.0));
  float a = (core * 0.4 + band + tick) * fade * uIntensity;
  gl_FragColor = vec4(col, a);
}
`;

// Atmospheric backlight behind the mark.
const HALO_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float g = pow(max(0.0, 1.0 - r), 2.2);
  vec3 col = mix(uEdge, uCore, g);
  gl_FragColor = vec4(col, g * uIntensity);
}
`;

// Orbit loop with a comet trail behind its node (u runs along the ring).
const ORBIT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uHead;
uniform float uDir;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float ang = vUv.x * 6.2831853;
  float d = mod(uDir * (uHead - ang), 6.2831853);
  float trail = exp(-d * 1.4);
  float a = (0.12 + 0.88 * trail) * uIntensity;
  gl_FragColor = vec4(uColor * (0.55 + 0.9 * trail), a);
}
`;

// The route-change turn: a slow, symmetric ease-in-out (peak ≈ 3.6 rad/s),
// never a whip.
const SPIN_DURATION = 2.6;
function easeInOutCubic(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

// ---------------------------------------------------------------------------
// The extruded, welded, vertex-coloured solid is deterministic per quality and
// the most expensive thing any piece builds (tens of ms of triangulation), so
// every mark on a world shares one copy. Keyed by the engine's piece context
// (one per world, so nothing outlives the world that built it); the GPU
// buffers are freed when the last mark lets go, and the CPU copy stays for the
// next mark on the same world.
const SHARED_SOLIDS = new WeakMap();

function acquireMarkSolid(ctx, low) {
  let entry = SHARED_SOLIDS.get(ctx);
  if (!entry || entry.low !== low) {
    entry = { low, users: 0, ...buildMarkSolid(ctx.THREE, low) };
    SHARED_SOLIDS.set(ctx, entry);
  }
  entry.users += 1;
  let released = false;
  return {
    geometry: entry.geometry,
    halfHeight: entry.halfHeight,
    release() {
      if (released) return;
      released = true;
      entry.users = Math.max(0, entry.users - 1);
      if (entry.users === 0) entry.geometry.dispose();
    },
  };
}

function buildMarkSolid(THREE, low) {
  const contours = [
    circleContour(21, 91, 5),
    circleContour(29, 72, 6),
    circleContour(41, 53, 7),
    roundedRectContour(22, 101, 13, 25, 6.5),
    roundedRectContour(40, 84, 15, 42, 7.5),
    tallBarContour(),
    dContour(),
  ];
  const extrudeOptions = {
    depth: DEPTH,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: BEVEL_T,
    bevelSize: BEVEL_S,
    bevelSegments: low ? 3 : 5,
    curveSegments: 28,
  };
  const parts = contours.map((pts) => {
    const g = new THREE.ExtrudeGeometry(toShape(THREE, pts), extrudeOptions);
    // Drop uv/normal so shared positions weld; smooth normals are rebuilt
    // below (ExtrudeGeometry's own normals are faceted per triangle).
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    const welded = mergeVertices(g, 1e-3);
    g.dispose();
    return welded;
  });
  const markGeo = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());

  markGeo.computeBoundingBox();
  const bb = markGeo.boundingBox;
  const scale = MARK_WIDTH / (bb.max.x - bb.min.x);
  const ox = (bb.min.x + bb.max.x) / 2;
  const oy = (bb.min.y + bb.max.y) / 2;
  const oz = (bb.min.z + bb.max.z) / 2;
  markGeo.translate(-ox, -oy, -oz);
  markGeo.scale(scale, scale, scale);
  markGeo.computeVertexNormals();
  markGeo.computeBoundingBox();
  markGeo.computeBoundingSphere();

  // Per-vertex brand gradient along the logo's own diagonal (top-left royal
  // violet → bottom-right mauve magic). Side walls and the back run deeper so
  // the rim lights read as thin edge glints, not a lavender wash.
  const pos = markGeo.attributes.position;
  const nrm = markGeo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const zMin = -BEVEL_T;
  const zSpan = DEPTH + 2 * BEVEL_T;
  const gLen2 = GRAD_DX * GRAD_DX + GRAD_DY * GRAD_DY;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / scale + ox;
    const ySvg = -(pos.getY(i) / scale + oy);
    const zN = (pos.getZ(i) / scale + oz - zMin) / zSpan;
    const g = Math.min(1, Math.max(0, ((x - GRAD_X0) * GRAD_DX + (ySvg - GRAD_Y0) * GRAD_DY) / gLen2));
    const facing = Math.abs(nrm.getZ(i));
    c.setHex(rampColor(0.28 + 0.72 * g));
    c.multiplyScalar(ALBEDO * (0.7 + 0.3 * zN) * (SIDE_SHADE + (1 - SIDE_SHADE) * facing));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  markGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const halfHeight = (markGeo.boundingBox.max.y - markGeo.boundingBox.min.y) / 2;
  return { geometry: markGeo, halfHeight };
}

// ---------------------------------------------------------------------------

export function createMarkPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const low = quality === 'low';
  const object = new THREE.Group();
  object.name = 'piece:mark';

  // --- the mark solid -------------------------------------------------------
  const solid = acquireMarkSolid(ctx, low);
  const markGeo = solid.geometry;
  const markHalfH = solid.halfHeight;

  const markMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    metalness: METALNESS,
    roughness: ROUGHNESS,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
    envMap: envMap || null,
    envMapIntensity: ENV_INTENSITY,
    emissive: new THREE.Color(palette.hyperMagenta),
    emissiveIntensity: EMISSIVE,
  });
  const markMesh = new THREE.Mesh(markGeo, markMat);

  // floatGroup bobs (mark + orbits together); markGroup yaws/pitches/scales.
  const floatGroup = new THREE.Group();
  const markGroup = new THREE.Group();
  markGroup.add(markMesh);
  floatGroup.add(markGroup);
  object.add(floatGroup);

  // --- atmospheric backlight -------------------------------------------------
  const haloUniforms = {
    uCore: { value: new THREE.Color(palette.royalViolet) },
    uEdge: { value: new THREE.Color(palette.indigo) },
    uIntensity: { value: 0.16 },
  };
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      vertexShader: PLANE_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.position.set(0, 0.1, -1.8);
  halo.renderOrder = -1;
  object.add(halo);

  // --- lit platform --------------------------------------------------------
  const platform = new THREE.Group();
  platform.position.y = -(markHalfH + 0.42);
  platform.rotation.x = 0.14; // lean the front edge down a hair so the disc reads
  object.add(platform);

  const platformUniforms = {
    uCore: { value: new THREE.Color(palette.purpleX11) },
    uEdge: { value: new THREE.Color(palette.indigo2) },
    uIntensity: { value: 1 },
    uTime: { value: 0 },
  };
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 7.2).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      uniforms: platformUniforms,
      vertexShader: PLANE_VERT,
      fragmentShader: PLATFORM_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  platform.add(disc);

  const ringRadius = MARK_WIDTH * 0.69; // ≈ 1.4× the mark's width across
  const ringColor = new THREE.Color(palette.neonViolet);
  const ringMat = new THREE.MeshBasicMaterial({
    color: ringColor,
    toneMapped: false,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(ringRadius, 0.015, 10, low ? 160 : 256).rotateX(Math.PI / 2),
    ringMat,
  );
  platform.add(ring);

  const innerRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.royalViolet),
    toneMapped: false,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(ringRadius * 0.8, 0.006, 6, low ? 128 : 200).rotateX(Math.PI / 2),
    innerRingMat,
  );
  innerRing.position.y = 0.01;
  platform.add(innerRing);

  // --- orbiting signal nodes -----------------------------------------------
  const orbitRoot = new THREE.Group();
  floatGroup.add(orbitRoot);

  function makeOrbit(radius, tiltX, tiltZ, hex, nodeRadius, speed, phase) {
    const group = new THREE.Group();
    group.rotation.set(tiltX, 0, tiltZ);
    const uniforms = {
      uColor: { value: new THREE.Color(hex) },
      uHead: { value: 0 },
      uDir: { value: Math.sign(speed) || 1 },
      uIntensity: { value: 0.6 },
    };
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.0065, 6, low ? 180 : 320),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: PLANE_VERT,
        fragmentShader: ORBIT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(nodeRadius, low ? 16 : 28, low ? 12 : 20),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(hex).multiplyScalar(1.8),
        toneMapped: false,
      }),
    );
    group.add(loop, node);
    orbitRoot.add(group);
    return { group, node, uniforms, radius, speed, phase };
  }

  const orbits = [
    makeOrbit(2.45, 1.2, 0.42, palette.neonViolet, 0.075, 0.42, 0.6),
    makeOrbit(2.7, 1.4, -0.6, palette.mauveMagic, 0.058, -0.27, 2.4),
  ];

  // --- motion state (preallocated; update() allocates nothing) --------------
  let prevWarp = 0;
  let spinStart = -1;

  function update(state) {
    const t = state.time || 0;
    const local = state.local || 0;
    const focus = state.focus || 0;
    const warp = state.warp || 0;
    const px = state.pointer ? state.pointer.x : 0;
    const py = state.pointer ? state.pointer.y : 0;
    const gx = state.grab ? state.grab.x : 0;
    const gy = state.grab ? state.grab.y : 0;

    // Route-change warp → one slow full turn that settles where it started.
    if (warp > 0.35 && prevWarp <= 0.35 && spinStart < 0) spinStart = t;
    prevWarp = warp;
    let spin = 0;
    if (spinStart >= 0) {
      const p = (t - spinStart) / SPIN_DURATION;
      if (p >= 1 || p < 0) spinStart = -1;
      else spin = TAU * easeInOutCubic(p);
    }

    const past = Math.min(1, Math.max(0, local));
    const yaw = Math.sin((t * TAU) / 11) * 0.35 + gx + px * 0.12 + spin;
    const pitch = Math.sin((t * TAU) / 15 + 1.1) * 0.05 + gy - py * 0.12 + past * 0.25;
    markGroup.rotation.set(pitch, yaw, 0);
    markGroup.scale.setScalar(1 - 0.08 * past);
    floatGroup.position.y = Math.sin((t * TAU) / 6) * 0.12;

    for (let i = 0; i < orbits.length; i++) {
      const o = orbits[i];
      let a = (o.phase + o.speed * t) % TAU;
      if (a < 0) a += TAU;
      o.node.position.set(Math.cos(a) * o.radius, Math.sin(a) * o.radius, 0);
      o.uniforms.uHead.value = a;
      o.uniforms.uIntensity.value = 0.35 + 0.35 * focus;
    }
    orbitRoot.rotation.y = t * 0.045;

    const glow = 0.55 + 0.45 * focus;
    platformUniforms.uTime.value = t;
    platformUniforms.uIntensity.value = glow;
    ringMat.opacity = 0.5 + 0.35 * focus;
    haloUniforms.uIntensity.value = 0.1 + 0.08 * focus;
  }

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    object.traverse((o) => {
      // The solid is shared with every other mark on this world.
      if (o.geometry && o.geometry !== markGeo) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    solid.release();
  }

  return { object, radius: 2.6, update, dispose };
}
