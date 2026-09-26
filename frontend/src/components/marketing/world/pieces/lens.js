// Lens — "a live database, not a stale export".
//
// An instanced table of data dots, tilted back like a sheet seen at an angle,
// with a metal-and-glass magnifier hovering above it on a slow Lissajous scan.
// Dots under the lens brighten along the signal ramp, lift toward the glass
// and swell; a faint additive halo marks the scanned spot on the table, and a
// few dots blip on their own now and then (the data is live). As `local` goes
// -1 → 0 the table rises in row by row, then the lens drops in.
//
// Piece contract: see ../README.md.

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

// Deterministic PRNG so the layout is identical on every visit.
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

// Additive glows fade toward black with the scene fog (mixing toward the fog
// color would add haze instead of fading).
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

// Soft ring at the lens radius, a faint fill, and a slow outward "ping".
const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uOpacity;
uniform float uRing;
uniform float uPing;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length( p );
  float ringD = ( r - uRing ) / 0.055;
  float ring = exp( - ringD * ringD );
  float fill = ( 1.0 - smoothstep( 0.0, uRing, r ) ) * 0.08;
  float pingR = mix( 0.12, uRing, uPing );
  float pingD = ( r - pingR ) / 0.04;
  float ping = exp( - pingD * pingD ) * ( 1.0 - uPing ) * 0.35;
  float edge = 1.0 - smoothstep( 0.86, 1.0, r );
  float alpha = ( ring * 0.55 + fill + ping ) * edge * uOpacity;
  ${FOG_FADE}
  vec3 col = mix( uCore, uColor, smoothstep( 0.0, uRing, r ) );
  gl_FragColor = vec4( col, alpha );
  #include <colorspace_fragment>
}
`;

export function createLensPiece(ctx) {
  const { THREE, quality, envMap, palette } = ctx;
  const high = quality !== 'low';

  const COLS = high ? 26 : 18;
  const ROWS = high ? 16 : 11;
  const COUNT = COLS * ROWS;
  const W = 7;
  const H = 4.2;
  const STEP_X = W / (COLS - 1);
  const STEP_Y = H / (ROWS - 1);
  const DOT_R = high ? 0.05 : 0.062;
  const TILT = -0.9; // table tilted back on x
  const LENS_R = 0.95;
  const HOVER = 0.5; // lens height above the table (table-local +z)
  const LENS_TILT = 0.24; // lens leans slightly toward the viewer
  // The camera looks roughly down world -z; seen through the lens, the spot on
  // the table sits "behind" the lens along that ray. Place the lens so the
  // highlighted dots land inside the glass on screen.
  const VIEW_OFFSET = (HOVER - 0.12) * Math.tan(-TILT);
  const AX = W / 2 - 0.95; // Lissajous amplitude (grid space)
  const AY = H / 2 - 0.8;
  const FX = 0.37;
  const FY = 0.53;
  const LIFT = 0.25;
  const SWELL = 0.4; // 1.4× under the lens

  const rand = mulberry32(0x1e75);

  const object = new THREE.Group();
  object.name = 'piece:lens';

  // Pointer parallax + hero drag live on an inner rig; the engine owns
  // `object`'s own transform.
  const rig = new THREE.Group();
  object.add(rig);

  const table = new THREE.Group();
  table.rotation.x = TILT;
  table.position.y = -0.1;
  rig.add(table);

  // ---------------------------------------------------------------- dots ---
  const dotGeo = new THREE.IcosahedronGeometry(DOT_R, high ? 1 : 0);
  const glowArr = new Float32Array(COUNT);
  const glowAttr = new THREE.InstancedBufferAttribute(glowArr, 1);
  glowAttr.setUsage(THREE.DynamicDrawUsage);
  dotGeo.setAttribute('aGlow', glowAttr);

  const dotMat = new THREE.MeshStandardMaterial({
    color: palette.white,
    roughness: 0.32,
    metalness: 0.15,
    envMap,
    envMapIntensity: 0.9,
  });
  // Per-instance emissive: the instance color times a per-instance glow, so
  // scanned dots actually light up (and catch the bloom) while resting dots
  // stay quiet.
  dotMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aGlow;\nvarying float vGlow;',
      )
      .replace('#include <color_vertex>', '#include <color_vertex>\n\tvGlow = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor.rgb * vGlow;',
      );
  };
  dotMat.customProgramCacheKey = () => 'datapit-lens-dots';

  const dots = new THREE.InstancedMesh(dotGeo, dotMat, COUNT);
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dots.frustumCulled = false;
  table.add(dots);

  const gridX = new Float32Array(COUNT);
  const gridY = new Float32Array(COUNT);
  const delay = new Float32Array(COUNT);
  const baseRGB = new Float32Array(COUNT * 3);
  const blipRate = new Float32Array(COUNT);
  const blipPhase = new Float32Array(COUNT);
  const wavePhase = new Float32Array(COUNT);

  const cInk = new THREE.Color(palette.ink600);
  const cIndigo = new THREE.Color(palette.indigo2);
  const cMid = new THREE.Color(palette.hyperMagenta);
  const cHi = new THREE.Color(palette.mauveMagic);
  const cBlip = new THREE.Color(palette.neonViolet);
  const tmpColor = new THREE.Color();
  const mtx = new THREE.Matrix4();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      gridX[i] = -W / 2 + c * STEP_X;
      gridY[i] = -H / 2 + r * STEP_Y;
      // Row by row from the front edge back, with a little column jitter.
      delay[i] = (r / (ROWS - 1)) * 0.5 + rand() * 0.06;
      // Resting color: a mix of ink and deep indigo, like a dense table.
      tmpColor.copy(cInk).lerp(cIndigo, 0.4 + rand() * 0.4);
      baseRGB[i * 3] = tmpColor.r;
      baseRGB[i * 3 + 1] = tmpColor.g;
      baseRGB[i * 3 + 2] = tmpColor.b;
      // About one dot in six can "blip" (a live update) on a slow cycle.
      blipRate[i] = rand() < 0.12 ? 0.3 + rand() * 0.4 : 0;
      blipPhase[i] = rand() * TAU;
      wavePhase[i] = gridX[i] * 0.7 + gridY[i] * 0.5;
      mtx.makeScale(0, 0, 0);
      dots.setMatrixAt(i, mtx);
      dots.setColorAt(i, tmpColor);
    }
  }
  dots.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const colorArr = dots.instanceColor.array;

  // ---------------------------------------------------------- table rules ---
  // Faint row separators and a border, like the rules of a data table.
  const ruleVerts = [];
  const ruleCols = [];
  const x0 = -W / 2 - STEP_X * 0.5;
  const x1 = W / 2 + STEP_X * 0.5;
  const y0 = -H / 2 - STEP_Y * 0.5;
  const y1 = H / 2 + STEP_Y * 0.5;
  const cRule = new THREE.Color(palette.ink600);
  const pushLine = (ax, ay, bx, by, k) => {
    ruleVerts.push(ax, ay, -0.07, bx, by, -0.07);
    for (let j = 0; j < 2; j++) ruleCols.push(cRule.r * k, cRule.g * k, cRule.b * k);
  };
  for (let r = 0; r <= ROWS; r++) {
    const edge = r === 0 || r === ROWS;
    pushLine(x0, y0 + r * STEP_Y, x1, y0 + r * STEP_Y, edge ? 0.55 : 0.2);
  }
  pushLine(x0, y0, x0, y1, 0.55);
  pushLine(x1, y0, x1, y1, 0.55);
  const ruleGeo = new THREE.BufferGeometry();
  ruleGeo.setAttribute('position', new THREE.Float32BufferAttribute(ruleVerts, 3));
  ruleGeo.setAttribute('color', new THREE.Float32BufferAttribute(ruleCols, 3));
  const ruleMat = new THREE.LineBasicMaterial({
    color: palette.white,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const rules = new THREE.LineSegments(ruleGeo, ruleMat);
  table.add(rules);

  // ----------------------------------------------------------- scan halo ---
  const HALO_SIZE = 2.9;
  const haloGeo = new THREE.PlaneGeometry(HALO_SIZE, HALO_SIZE);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColor: { value: new THREE.Color(palette.hyperMagenta) },
        uCore: { value: new THREE.Color(palette.mauveMagic) },
        uOpacity: { value: 0 },
        uRing: { value: (LENS_R / (HALO_SIZE / 2)) * 0.98 },
        uPing: { value: 0 },
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
  halo.position.z = -0.02;
  halo.renderOrder = 1;
  table.add(halo);

  // --------------------------------------------------------------- lens ---
  const lens = new THREE.Group();
  table.add(lens);
  const lensInner = new THREE.Group(); // reveal scale / lean
  lens.add(lensInner);

  // Gunmetal violet: dark enough that the bright studio environment reads as
  // crisp highlights instead of blooming the whole rim.
  const metalMat = new THREE.MeshPhysicalMaterial({
    color: palette.ink600,
    metalness: 0.8,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    envMap,
    envMapIntensity: 0.65,
  });

  // Cap punctual-light highlights on the rim so a pass near the world's rim
  // lights glints instead of blooming.
  metalMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      [
        '#include <lights_fragment_end>',
        'reflectedLight.directSpecular = min( reflectedLight.directSpecular, vec3( 1.4 ) );',
        '#ifdef USE_CLEARCOAT',
        '  clearcoatSpecularDirect = min( clearcoatSpecularDirect, vec3( 1.4 ) );',
        '#endif',
      ].join('\n'),
    );
  };
  metalMat.customProgramCacheKey = () => 'datapit-lens-metal';

  const ringGeo = new THREE.TorusGeometry(LENS_R, 0.06, high ? 24 : 12, high ? 128 : 64);
  const ring = new THREE.Mesh(ringGeo, metalMat);
  lensInner.add(ring);

  // Neon Violet focus ring just inside the rim (the brand's focus signal).
  const focusGeo = new THREE.TorusGeometry(LENS_R - 0.075, 0.009, 6, high ? 128 : 64);
  const focusMat = new THREE.MeshBasicMaterial({
    color: palette.neonViolet,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
  });
  const focusRing = new THREE.Mesh(focusGeo, focusMat);
  focusRing.position.z = 0.012;
  lensInner.add(focusRing);

  // Biconvex glass: a flattened sphere reads as a real lens edge-on.
  const glassGeo = new THREE.SphereGeometry(LENS_R - 0.03, high ? 64 : 32, high ? 24 : 12);
  const glassMat = high
    ? new THREE.MeshPhysicalMaterial({
        color: palette.white,
        metalness: 0,
        roughness: 0.05,
        transmission: 0.9,
        thickness: 0.3,
        ior: 1.35,
        attenuationColor: new THREE.Color(palette.mauve2),
        attenuationDistance: 2.5,
        specularIntensity: 0.6,
        envMap,
        envMapIntensity: 0.4,
      })
    : new THREE.MeshPhysicalMaterial({
        // Low tier: skip the transmission pass, fake the glass with opacity.
        color: palette.mauve2,
        metalness: 0,
        roughness: 0.06,
        transparent: true,
        opacity: 0.1,
        specularIntensity: 0.6,
        depthWrite: false,
        envMap,
        envMapIntensity: 0.35,
      });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.scale.set(1, 1, 0.13);
  lensInner.add(glass);

  // Handle toward the lower right, so the silhouette reads as "search".
  const HANDLE_ANGLE = -Math.PI / 4;
  const HANDLE_LEN = 0.95;
  const handleGeo = new THREE.CylinderGeometry(0.068, 0.05, HANDLE_LEN, high ? 20 : 10);
  const handle = new THREE.Mesh(handleGeo, metalMat);
  const hd = LENS_R + 0.05 + HANDLE_LEN / 2;
  handle.position.set(Math.cos(HANDLE_ANGLE) * hd, Math.sin(HANDLE_ANGLE) * hd, 0);
  handle.rotation.z = HANDLE_ANGLE - Math.PI / 2;
  lensInner.add(handle);
  const collarGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.09, high ? 20 : 10);
  const collar = new THREE.Mesh(collarGeo, metalMat);
  const cd = LENS_R + 0.09;
  collar.position.set(Math.cos(HANDLE_ANGLE) * cd, Math.sin(HANDLE_ANGLE) * cd, 0);
  collar.rotation.z = HANDLE_ANGLE - Math.PI / 2;
  lensInner.add(collar);

  // --------------------------------------------------------------- state ---
  let scanPhase = 1.7; // start mid-sweep rather than at an extreme
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

    // Pointer parallax (smoothed) + hero drag.
    const k = 1 - Math.exp(-dt * 3);
    ptrX += ((pointer ? pointer.x : 0) - ptrX) * k;
    ptrY += ((pointer ? pointer.y : 0) - ptrY) * k;
    const gx = grab ? grab.x : 0;
    const gy = grab ? grab.y : 0;
    rig.rotation.y = ptrX * 0.1 + gx;
    rig.rotation.x = -ptrY * 0.06 + Math.max(-0.5, Math.min(0.5, gy));

    // Reveal: -1 → 0 raises the table row by row, then the lens drops in.
    const reveal = clamp01(local + 1);
    const lensP = ease(clamp01((reveal - 0.3) / 0.7));

    // Scan along a slow Lissajous; a touch faster when the chapter is centered.
    scanPhase += dt * (0.55 + 0.35 * focus + warp * 1.6);
    const ax = scanPhase * FX + 0.6;
    const ay = scanPhase * FY;
    const hx = AX * Math.sin(ax);
    const hy = AY * Math.sin(ay) + 0.12;
    const vx = Math.cos(ax); // normalized velocity, for the lean
    const vy = Math.cos(ay);

    // Lens hovers so the scanned spot shows through the glass.
    lens.position.set(
      hx,
      hy - VIEW_OFFSET,
      HOVER + Math.sin(time * 0.9) * 0.03 + (1 - lensP) * 0.9,
    );
    lens.rotation.set(LENS_TILT - vy * 0.1, vx * 0.12, 0);
    lensInner.scale.setScalar(0.55 + 0.45 * lensP);
    lens.visible = lensP > 0.001;
    focusMat.opacity = 0.85 * lensP;

    halo.position.x = hx;
    halo.position.y = hy;
    const ping = (time * 0.42) % 1;
    haloMat.uniforms.uPing.value = ping;
    haloMat.uniforms.uOpacity.value = lensP * (0.4 + 0.15 * focus + 0.5 * warp);
    halo.visible = lensP > 0.001;

    ruleMat.opacity = smoothstep(0.1, 0.9, reveal) * (0.7 + 0.3 * focus);

    // Dots.
    const inR = 0.3;
    const outR = LENS_R + 0.14;
    for (let i = 0; i < COUNT; i++) {
      const p = ease(clamp01((reveal - delay[i]) / 0.44));
      const x = gridX[i];
      const y = gridY[i];
      const dx = x - hx;
      const dy = y - hy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const h = (1 - smoothstep(inR, outR, d)) * lensP;

      let b = 0;
      const br = blipRate[i];
      if (br > 0) b = smoothstep(0.975, 1, Math.sin(time * br + blipPhase[i])) * (1 - h);

      const wave = Math.sin(time * 0.9 + wavePhase[i]) * 0.022;
      const z = wave + h * LIFT + (1 - p) * -0.55;
      const s = p * (1 + SWELL * h + 0.15 * b);
      mtx.makeScale(s, s, s);
      mtx.setPosition(x, y, z);
      dots.setMatrixAt(i, mtx);

      // Base → hyper magenta at the rim → mauve magic at the center.
      const j = i * 3;
      const hc = smoothstep(0, 0.7, h);
      const hr = cMid.r + (cHi.r - cMid.r) * h;
      const hg = cMid.g + (cHi.g - cMid.g) * h;
      const hb = cMid.b + (cHi.b - cMid.b) * h;
      let r = baseRGB[j] + (hr - baseRGB[j]) * hc;
      let g = baseRGB[j + 1] + (hg - baseRGB[j + 1]) * hc;
      let bl = baseRGB[j + 2] + (hb - baseRGB[j + 2]) * hc;
      const bk = b * 0.5;
      r += (cBlip.r - r) * bk;
      g += (cBlip.g - g) * bk;
      bl += (cBlip.b - bl) * bk;
      const fade = 0.15 + 0.85 * p;
      colorArr[j] = r * fade;
      colorArr[j + 1] = g * fade;
      colorArr[j + 2] = bl * fade;

      glowArr[i] = (0.06 + 0.32 * h + 0.26 * b + 0.2 * warp) * p;
    }
    dots.instanceMatrix.needsUpdate = true;
    dots.instanceColor.needsUpdate = true;
    glowAttr.needsUpdate = true;
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
    dots.dispose();
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    object.removeFromParent();
  }

  return { object, radius: 3.8, update, dispose };
}
