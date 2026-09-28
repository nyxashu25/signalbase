# The Signal World — WebGL layer of the marketing site

One persistent Three.js scene lives behind every marketing page (the
"storybook"). Scrolling flies a camera through a chain of **stations**, one per
content chapter; each station hosts a 3D **set piece**. Route changes play a
**warp** (particles streak, camera punches forward) and lay out the new page's
stations. First visit in a session plays an **intro descent** into the pit.
Touch screens (`pointer: coarse`) load the engine on the reader's first
interaction (scroll, touch, key) rather than during the page load, and skip the
intro; the CSS mark and 2D river hold the stage until then.

Inspired by the fixed-world fly-through of qaima.online (CSS 3D stations along
-Z), the lit hero object of a24.raviklaassens.com, and the one-set-piece-per-
section gallery of amix-design.com — rendered in the DataPit Design Language
(deep indigo "pit", violet signal ramp, glow as atmosphere, never hierarchy).

## Files and ownership

| File | Owns |
|---|---|
| `palette.js` | Brand colors as THREE.Color-ready hex + helpers (`rampColor(t)`). |
| `threeKit.js` | `THREE` — the named-import slice of three.js handed to pieces and the field as `ctx.THREE` (never `import * as THREE`, which would defeat tree-shaking). |
| `engine.js` | `createSignalWorld()` — renderer, bloom, environment, fog, lights, camera rig, station layout, piece lifecycle, warp, intro, drag, pause, dispose. |
| `field.js` | `createSignalField()` — the global GPU particle field that fills the whole flight path (always on; drives the warp streak). |
| `pieces/index.js` | `PIECES` registry: station key → piece factory. |
| `pieces/<key>.js` | One set piece each (see keys below). |
| `../SignalWorld.jsx` | React host: capability check, lazy import of `engine.js` (after idle; on touch screens after the first interaction), canvas, feeds scroll/pointer/stations, fallback, `worldStore`. |
| `../worldStore.js` | Tiny external store: `{ active, ready }` + `useWorldActive()`. |

**Nothing outside `world/` and `SignalWorld.jsx` may import `three`.** The
engine is loaded with a dynamic `import()` so three.js stays out of the main
bundle and never loads in jsdom tests.

## Engine API (`engine.js`)

```js
const world = await createSignalWorld({ canvas, quality }); // quality: 'high' | 'low'
world.setStations(stations)   // [{ key, side }] in DOM order. key ∈ PIECES or 'drift'. side ∈ -1 | 0 | 1
world.setScroll(s)            // continuous station coordinate: s = k when chapter k is centered in the viewport
                              // (the host clamps each chapter's rest point to what the viewport centre can reach,
                              //  so s = 0 at the top of every page; send it *before* setStations on a new layout)
world.setPointer(nx, ny)      // pointer in NDC, -1..1 (y up)
world.grab(dxPx, dyPx)        // hero drag delta in pixels (spins the piece of the station nearest s; inertia on release)
world.release()
world.warp()                  // one-shot route-change pulse (~0.9 s)
world.intro()                 // Promise — camera descends from above into station 0 (~2.4 s)
world.resize(width, height)   // CSS pixels
world.setPaused(bool)         // tab hidden / offscreen
world.dispose()               // free every GPU resource, stop the loop
world.ready                   // true once first frame rendered
```

### Station layout (engine)

- Station `k` sits at `P_k = (side_k * 3.4, wave(k), -k * 18)` world units.
- The camera for station `k` sits in front of and opposite the piece so the
  piece lands at roughly NDC `x ≈ side_k * 0.42` on landscape viewports; on
  portrait viewports (aspect < 1) pieces center (`side` treated as 0), sit
  further back and a little low (about half the screen width) with quieter
  bloom, so they read as a backdrop behind the text.
- Chapters put their piece on the copy side (`StoryChapter`: the opaque
  mockup plate would hide it); covers put it on the right (`side` 1).
- Camera position and look target are CatmullRom curves through every
  station's framing, sampled at `s / (n - 1)` — scrolling between chapters is a
  continuous flight forward into depth, never a cut.
- Pieces whose station is more than 2 stations from `s` are hidden
  (`visible = false`) and not updated.
- Duplicate keys are allowed (each station gets its own instance).
- Built pieces are pooled by key across `setStations` calls: a route change
  reuses every piece whose key recurs (in order) and disposes only the
  leftovers. Stations within 3 of the camera are built as soon as a layout
  lands; the rest are built one per frame, nearest first.

## Piece contract (`pieces/<key>.js`)

```js
export function createXPiece(ctx) {
  // ctx = { THREE, quality, envMap, palette } — THREE is threeKit.js's slice
  // of three (add a class there if a piece needs one it lacks). The same ctx
  // object lives as long as its world, so a piece may key shared, per-world
  // resources on it (the mark shares its extruded solid via a WeakMap).
  return {
    object,          // THREE.Object3D, centered on its own origin, ~3–5 units across
    radius,          // approximate bounding radius (camera framing)
    update(state),   // every frame while within 2 stations of the camera
    dispose(),       // dispose every geometry/material/texture it created
  };
}
// state = {
//   time,      // seconds since world start
//   dt,        // seconds since last frame (clamped ≤ 0.05)
//   focus,     // 0..1 — 1 when this station is centered (1 - |s - k|, clamped)
//   local,     // s - k, signed, roughly -2..2 — scrub sub-animations with it
//   pointer,   // { x, y } NDC
//   warp,      // 0..1 route-change pulse strength
//   grab,      // { x, y } accumulated drag rotation in radians (hero drag)
// }
```

Rules for every piece:

- Import only from `three` and `three/examples/jsm/...`. No `document`/`window`
  at module top level; no DOM textures (procedural `ShaderMaterial`s or plain
  materials instead) so a Node smoke test can construct it.
- **No allocations inside `update`** — preallocate vectors/colors.
- Materials: `MeshPhysicalMaterial`/`MeshStandardMaterial` using `ctx.envMap`
  for reflections, or `ShaderMaterial` for glow. Reflection strength is each
  material's own `envMapIntensity` (three ignores `scene.environmentIntensity`
  once `envMap` is set): the studio's panels are HDR, so large flat or
  stacked reflective faces stay low (≈ 0.15–0.35) or they bloom into a white
  wash. Emissive intensities stay moderate (bloom threshold ≈ 0.22); the
  brightest things are small accents.
- GLSL: no builtin with an undefined domain — `pow(x, y)` needs `x ≥ 0`
  (clamp varyings: MSAA extrapolates them past the silhouette), write
  squares as `x * x`, `smoothstep` needs `edge0 < edge1`, never `atan(0, 0)`.
  A NaN pixel shows as a black speck.
- Colors only from `ctx.palette` (brand ramp + ink neutrals).
- Animate from `time` + `local`/`focus`; idle motion is slow (the design
  language: premium, precise — not cyberpunk cosplay).
- `dispose()` must be complete (traverse and dispose geometries + materials).

## Station keys

| key | set piece |
|---|---|
| `mark` | The DataPit mark as a real extruded, beveled, reflective solid (three signal nodes, three data bars, the open D), on a lit ring platform with orbiting signal nodes. Hero; drag-spinnable. |
| `tunnel` | "Descending into the pit": receding glowing rings with particles spiralling inward. |
| `reveal` | A floating glass contact card whose masked (blurred) email line resolves to sharp on a sweep; a verified badge orbits. |
| `sequence` | Nodes along a curved tube; light pulses travel the tube and light each node as they pass (email → wait → follow-up). |
| `ledger` | A helix of thin coin discs slowly rotating; coins drop in (grants) and peel away (reveals). |
| `lens` | A glass lens ring scanning across an instanced grid of data dots; dots under the lens brighten and lift. |
| `crystals` | Six faceted crystals orbiting a glowing core (the six roles). |
| `city` | Instanced ascending data bars — the logo's bars grown into a skyline — heights breathing in a wave. |
| `blocks` | Seat blocks: solid violet "paid" cubes + glass "free" cubes that assemble from scattered as `local` goes −1 → 0. |
| `drift` | No piece — only the global field (engine handles; not in `PIECES`). |
