// DataPit Design Language colors (DataPit_Design_Language/tokens) for the
// WebGL world. Hex numbers so they drop straight into THREE.Color / materials.
export const palette = {
  // Signal ramp, deepest → palest (DESIGN_LANGUAGE.md §3)
  indigo: 0x440066,
  indigo2: 0x610091,
  royalViolet: 0x7c00ba,
  darkViolet: 0x9400de,
  purpleX11: 0xaa00ff,
  hyperMagenta: 0xbe3dff,
  neonViolet: 0xc552ff,
  mauveMagic: 0xcf70ff,
  mauve: 0xdd99ff,
  mauve2: 0xe7b3ff,
  // Ink neutrals
  ink950: 0x110019,
  ink900: 0x180022,
  ink800: 0x250031,
  ink700: 0x3a2442,
  ink600: 0x5b4963,
  ink300: 0xbaafc0,
  white: 0xffffff,
  // The world's clear color / fog — a hair deeper than ink-950 (the dark
  // theme's --dp-bg), so the canvas reads as the pit, not a flat panel.
  void: 0x0a0011,
};

// The brand gradient (Indigo 2 → Royal Violet → Purple X11 → Hyper Magenta →
// Mauve Magic), as stops for sampling.
const RAMP = [
  [0, palette.indigo2],
  [0.28, palette.royalViolet],
  [0.55, palette.purpleX11],
  [0.76, palette.hyperMagenta],
  [1, palette.mauveMagic],
];

function lerpHex(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** Sample the brand gradient at t ∈ [0, 1] → hex number. */
export function rampColor(t) {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, c1] = RAMP[i];
    const [t0, c0] = RAMP[i - 1];
    if (x <= t1) return lerpHex(c0, c1, (x - t0) / (t1 - t0));
  }
  return RAMP[RAMP.length - 1][1];
}
