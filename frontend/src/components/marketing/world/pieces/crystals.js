// Crystals — six roles, "built for whoever's chasing the number".
//
// A small glowing signal core wrapped in a soft fresnel glow and a thin
// faceted shell, with six faceted crystals (one per role, one ramp stop each)
// orbiting on two tilted planes, three per plane, each spinning on its own
// axis and breathing slightly out of phase. Faint lines tie every crystal back
// to the core. The pointer nudges the orbit tilt; as `local` goes -1 → 0 the
// crystals spiral in from far out to their orbits.
//
// Piece contract: see ../README.md.
import { rampColor } from '../palette.js';

const TAU = Math.PI * 2;

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
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

const GLOW_VERT = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewDir;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vNormalV = normalize( normalMatrix * normal );
  vViewDir = normalize( - mvPosition.xyz );
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

// A soft ball of light: brightest facing the viewer, falling to nothing at the
// silhouette, so there is never a hard edge.
const GLOW_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uEdge;
uniform float uIntensity;
varying vec3 vNormalV;
varying vec3 vViewDir;
#include <fog_pars_fragment>
void main() {
  float f = max( dot( normalize( vNormalV ), normalize( vViewDir ) ), 0.0 );
  float alpha = pow( f, 2.4 ) * uIntensity;
  ${FOG_FADE}
  vec3 col = mix( uEdge, uCore, f * f );
  gl_FragColor = vec4( col, alpha );
  #include <colorspace_fragment>
}
`;

// Hexagonal quartz-like prism with pyramidal ends, slightly asymmetric so it
// reads as grown, not machined. Built non-indexed with per-face normals: that
// gives the faceted look without `flatShading`, whose screen-space derivative
// normals go NaN on the sub-pixel slivers at the tips (a NaN pixel turns into
// a huge bloom blob).
function buildCrystalGeometry(THREE) {
  const SEG = 6;
  const R = 0.22;
  const Y_BOTTOM = -0.55;
  const Y_LOW = -0.17;
  const Y_HIGH = 0.2;
  const Y_TOP = 0.6;
  const TIP_SHIFT = 0.025; // apex a hair off-axis
  const pos = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const centroid = new THREE.Vector3();
  const inside = new THREE.Vector3(0, (Y_BOTTOM + Y_TOP) / 2, 0);
  const tri = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    a.set(ax, ay, az);
    b.set(bx, by, bz);
    c.set(cx, cy, cz);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    n.crossVectors(e1, e2);
    centroid.copy(a).add(b).add(c).divideScalar(3).sub(inside);
    // Wind every face outward (the solid is convex).
    if (n.dot(centroid) < 0) pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
    else pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * TAU;
    const a1 = ((i + 1) / SEG) * TAU;
    const x0 = Math.cos(a0) * R;
    const z0 = Math.sin(a0) * R;
    const x1 = Math.cos(a1) * R;
    const z1 = Math.sin(a1) * R;
    tri(TIP_SHIFT, Y_TOP, 0, x0, Y_HIGH, z0, x1, Y_HIGH, z1);
    tri(x0, Y_LOW, z0, x1, Y_LOW, z1, x1, Y_HIGH, z1);
    tri(x0, Y_LOW, z0, x1, Y_HIGH, z1, x0, Y_HIGH, z0);
    tri(-TIP_SHIFT * 0.6, Y_BOTTOM, 0, x1, Y_LOW, z1, x0, Y_LOW, z0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals(); // non-indexed → one normal per face
  return geo;
}

// The world's rim lights sit close to the orbit; a glossy facet swinging past
// one catches a specular peak in the hundreds, which the bloom turns into a
// blob. Cap the direct (punctual-light) specular so glints stay glints.
const SPEC_CAP = /* glsl */ `
#include <lights_fragment_end>
reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 1.6 ) );
#ifdef USE_CLEARCOAT
  clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 1.6 ) );
#endif
`;

function capDirectSpecular(shader) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', SPEC_CAP);
}

export function createCrystalsPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';

  const ORBIT_R = 2.1;
  const FAR_R = 5;
  const N = 6;
  // Two orbit planes, three crystals each. Euler order ZXY = tilt on x first,
  // then roll in screen space, so each orbit reads as a tilted ellipse.
  const PLANES = [
    { x: 1.18, z: 0.5, speed: 0.16, phase: 0.3 },
    { x: -1.1, z: -0.38, speed: -0.12, phase: 1.35 },
  ];

  const object = new THREE.Group();
  object.name = 'piece:crystals';
  const rig = new THREE.Group(); // pointer / hero drag
  object.add(rig);

  // ---------------------------------------------------------------- core ---
  const coreGeo = new THREE.IcosahedronGeometry(0.24, 2);
  const coreMat = new THREE.MeshBasicMaterial({ color: palette.hyperMagenta, toneMapped: false });
  const core = new THREE.Mesh(coreGeo, coreMat);
  rig.add(core);

  const glowGeo = new THREE.SphereGeometry(0.95, high ? 48 : 24, high ? 24 : 12);
  const glowMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uCore: { value: new THREE.Color(palette.mauveMagic) },
        uEdge: { value: new THREE.Color(palette.purpleX11) },
        uIntensity: { value: 0 },
      },
    ]),
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.renderOrder = 2;
  rig.add(glow);

  // A thin faceted shell around the core: precise, technical, quiet.
  const shellSrc = new THREE.IcosahedronGeometry(0.44, 1);
  const shellGeo = new THREE.EdgesGeometry(shellSrc);
  shellSrc.dispose();
  const shellMat = new THREE.LineBasicMaterial({
    color: palette.mauve,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shell = new THREE.LineSegments(shellGeo, shellMat);
  rig.add(shell);

  // ------------------------------------------------------------- orbits ---
  const orbitEuler = PLANES.map((p) => new THREE.Euler(p.x, 0, p.z, 'ZXY'));
  const orbitQuat = PLANES.map((p, i) => new THREE.Quaternion().setFromEuler(orbitEuler[i]));

  const ringPts = [];
  const RING_SEG = high ? 192 : 96;
  for (let i = 0; i < RING_SEG; i++) {
    const a = (i / RING_SEG) * TAU;
    ringPts.push(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R, 0);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPts, 3));
  const ringMat = new THREE.LineBasicMaterial({
    color: palette.mauve,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rings = PLANES.map((p, i) => {
    const loop = new THREE.LineLoop(ringGeo, ringMat);
    loop.rotation.copy(orbitEuler[i]);
    rig.add(loop);
    return loop;
  });

  // ------------------------------------------------------------ crystals ---
  const crystalGeo = buildCrystalGeometry(THREE);

  const RAMP_T = [0.2, 0.36, 0.52, 0.68, 0.84, 1.0];
  const crystals = [];
  const plane = new Uint8Array(N);
  const slot = new Float32Array(N);
  const spin = new Float32Array(N);
  const spinRate = new Float32Array(N);
  const sxz = new Float32Array(N);
  const sy = new Float32Array(N);
  const baseQuat = [];
  const tmpEuler = new THREE.Euler();

  for (let i = 0; i < N; i++) {
    const color = new THREE.Color(rampColor(RAMP_T[i]));
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.14,
      metalness: 0.2,
      // A touch of roughness spreads the studio panels across each facet, so
      // a facet turning into the light glints instead of flaring the bloom.
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.14,
      envMap,
      envMapIntensity: 0.6,
      ior: 1.5,
      specularIntensity: 1,
      ...(high
        ? {
            transmission: 0.35,
            thickness: 0.6,
            attenuationColor: color,
            attenuationDistance: 1.4,
            iridescence: 0.4,
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [120, 420],
          }
        : {}),
    });
    mat.onBeforeCompile = capDirectSpecular;
    mat.customProgramCacheKey = () => 'datapit-crystal-speccap';
    const mesh = new THREE.Mesh(crystalGeo, mat);
    rig.add(mesh);
    crystals.push(mesh);

    // Alternate planes so neighbouring ramp stops sit on different orbits.
    plane[i] = i % 2;
    slot[i] = Math.floor(i / 2);
    spin[i] = i * 1.1;
    spinRate[i] = (0.28 + ((i * 37) % 11) / 40) * (i % 3 === 0 ? -1 : 1);
    sxz[i] = 0.9 + ((i * 53) % 7) / 30;
    sy[i] = 0.92 + ((i * 29) % 5) / 12;
    tmpEuler.set(0.22 + (i % 3) * 0.12, i * 0.9, (i % 2 ? -1 : 1) * (0.18 + (i % 4) * 0.07));
    baseQuat.push(new THREE.Quaternion().setFromEuler(tmpEuler));
  }

  // ---------------------------------------------------- core → crystal ---
  const linkPos = new Float32Array(N * 2 * 3);
  const linkCol = new Float32Array(N * 2 * 3);
  const cLinkCore = new THREE.Color(palette.hyperMagenta);
  const cLinkEnd = new THREE.Color(palette.indigo2);
  for (let i = 0; i < N; i++) {
    const j = i * 6;
    linkCol[j] = cLinkCore.r;
    linkCol[j + 1] = cLinkCore.g;
    linkCol[j + 2] = cLinkCore.b;
    linkCol[j + 3] = cLinkEnd.r;
    linkCol[j + 4] = cLinkEnd.g;
    linkCol[j + 5] = cLinkEnd.b;
  }
  const linkGeo = new THREE.BufferGeometry();
  const linkPosAttr = new THREE.BufferAttribute(linkPos, 3);
  linkPosAttr.setUsage(THREE.DynamicDrawUsage);
  linkGeo.setAttribute('position', linkPosAttr);
  linkGeo.setAttribute('color', new THREE.BufferAttribute(linkCol, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: palette.white,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  links.frustumCulled = false;
  rig.add(links);

  // --------------------------------------------------------------- state ---
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const tmpQuat = new THREE.Quaternion();
  const tmpVec = new THREE.Vector3();
  const orbitPhase = new Float32Array([PLANES[0].phase, PLANES[1].phase]);
  let ptrX = 0;
  let ptrY = 0;
  let shellSpin = 0;

  function update(state) {
    const time = state.time || 0;
    const dt = state.dt || 0;
    const focus = state.focus || 0;
    const local = state.local || 0;
    const warp = state.warp || 0;
    const pointer = state.pointer;
    const grab = state.grab;

    const k = 1 - Math.exp(-dt * 2.5);
    ptrX += ((pointer ? pointer.x : 0) - ptrX) * k;
    ptrY += ((pointer ? pointer.y : 0) - ptrY) * k;

    // Hero drag spins the whole system.
    rig.rotation.y = grab ? grab.x : 0;
    rig.rotation.x = grab ? grab.y : 0;

    const arrive = clamp01(local + 1); // -1 → 0 maps 0 → 1
    const coreP = ease(clamp01((local + 1.15) / 0.8));

    // Core: small, bright, breathing slowly.
    const breathe = 1 + Math.sin(time * 1.1) * 0.035;
    core.scale.setScalar(Math.max(1e-4, coreP * breathe));
    glowMat.uniforms.uIntensity.value =
      coreP * (0.5 + 0.08 * Math.sin(time * 1.1 + 0.6) + 0.12 * focus + 0.6 * warp);
    glow.scale.setScalar(0.6 + 0.4 * coreP);
    shellSpin += dt * (0.08 + warp * 0.8);
    shell.rotation.set(shellSpin * 0.6, shellSpin, 0);
    shell.scale.setScalar(Math.max(1e-4, coreP * (1 + Math.sin(time * 0.7) * 0.02)));
    shellMat.opacity = 0.2 * coreP;

    // Orbit planes: pointer nudges the tilt.
    const tiltX = -ptrY * 0.12;
    const tiltZ = ptrX * 0.1;
    for (let p = 0; p < 2; p++) {
      const e = orbitEuler[p];
      e.set(PLANES[p].x + tiltX, 0, PLANES[p].z + tiltZ);
      orbitQuat[p].setFromEuler(e);
      rings[p].rotation.copy(e);
      orbitPhase[p] += dt * PLANES[p].speed * (1 + warp * 2.5);
    }
    ringMat.opacity = 0.16 * ease(arrive) * (0.75 + 0.25 * focus);

    let linkAlpha = 0;
    for (let i = 0; i < N; i++) {
      const mesh = crystals[i];
      // Staggered spiral fly-in from FAR_R.
      const pi = ease(clamp01((arrive - i * 0.07) / 0.6));
      const r = FAR_R + (ORBIT_R - FAR_R) * pi;
      const theta = orbitPhase[plane[i]] + (slot[i] * TAU) / 3 + (1 - pi) * 1.6;
      tmpVec.set(Math.cos(theta) * r, Math.sin(theta) * r, 0).applyQuaternion(orbitQuat[plane[i]]);
      mesh.position.copy(tmpVec);

      spin[i] += dt * spinRate[i] * (1 + warp * 3);
      mesh.quaternion.copy(baseQuat[i]).multiply(tmpQuat.setFromAxisAngle(Y_AXIS, spin[i]));

      const pulse = 1 + Math.sin(time * 1.25 + (i * TAU) / N) * 0.04;
      const s = (0.35 + 0.65 * pi) * pulse;
      mesh.scale.set(sxz[i] * s, sy[i] * s, sxz[i] * s);

      // Link from the core surface to just short of the crystal.
      const len = tmpVec.length() || 1;
      const j = i * 6;
      const a = 0.3 / len;
      const b = Math.max(0, 1 - 0.4 / len);
      linkPos[j] = tmpVec.x * a;
      linkPos[j + 1] = tmpVec.y * a;
      linkPos[j + 2] = tmpVec.z * a;
      linkPos[j + 3] = tmpVec.x * b;
      linkPos[j + 4] = tmpVec.y * b;
      linkPos[j + 5] = tmpVec.z * b;
      linkAlpha += pi;
    }
    linkPosAttr.needsUpdate = true;
    linkMat.opacity = (linkAlpha / N) * coreP * (0.28 + 0.12 * focus);
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
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    object.removeFromParent();
  }

  return { object, radius: 2.9, update, dispose };
}
